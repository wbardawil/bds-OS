// BDS OS — Edge Function: Delegate Questions
//
// POST { round_id, company_id, assignments: [
//   { practice_id?, customer_pillar_id?, assignee_email, assignee_name?,
//     message?, due_at? }
// ] }
//
// Caller: authenticated admin of company_id.
// For each assignment, creates a practice_assignments row with a share_token,
// then sends an email to the assignee with the share URL. If Resend isn't
// configured, returns the share URLs in the response so the admin can deliver
// them out-of-band.
//
// Validation:
//   - Each assignment must have exactly one of practice_id or customer_pillar_id.
//   - Caller must be admin of the company.
//   - round_id must belong to the company.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

interface AssignmentInput {
  practice_id?: string;
  customer_pillar_id?: string;
  assignee_email: string;
  assignee_name?: string;
  message?: string;
  due_at?: string;
}

interface RequestBody {
  round_id: string;
  company_id: string;
  assignments: AssignmentInput[];
}

async function sendDelegationEmail(args: {
  toEmail: string;
  toName: string | null;
  inviteUrl: string;
  inviterName: string;
  companyName: string;
  scopeDescription: string;
  message: string | null;
  dueAt: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };

  const fromEmail = Deno.env.get('INVITE_FROM_EMAIL') ?? 'invites@bds-os.example';
  const subject = `${args.inviterName} asked for your input — ${args.companyName}`;
  const dueText = args.dueAt
    ? `<p style="margin: 0 0 16px;">Please complete by <strong>${new Date(args.dueAt).toDateString()}</strong>.</p>`
    : '';
  const messageText = args.message
    ? `<p style="margin: 0 0 16px; padding: 12px; background: #f5f5f5; border-left: 3px solid #999;">${args.message}</p>`
    : '';

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">Your input is requested</h1>
    <p style="margin: 0 0 16px;"><strong>${args.inviterName}</strong> at <strong>${args.companyName}</strong> would like your input on ${args.scopeDescription}.</p>
    ${messageText}
    ${dueText}
    <p style="margin: 0 0 24px;">
      <a href="${args.inviteUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Provide your input</a>
    </p>
    <p style="margin: 0 0 8px; font-size: 14px; color: #666;">No account required. Or copy this URL:</p>
    <p style="margin: 0; font-size: 14px; color: #666; word-break: break-all;">${args.inviteUrl}</p>
  </body>
</html>`;

  const text = `${args.inviterName} at ${args.companyName} would like your input on ${args.scopeDescription}.

${args.message ? args.message + '\n\n' : ''}${args.dueAt ? `Please complete by ${new Date(args.dueAt).toDateString()}.\n\n` : ''}Visit: ${args.inviteUrl}`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromEmail,
        to: args.toEmail,
        subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      return { ok: false, error: `Resend ${response.status}: ${await response.text()}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);

    const supabase = createServiceClient();
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) return errorResponse('Invalid token', 401);
    const inviter = authData.user;

    const body = (await req.json()) as RequestBody;
    if (!body?.round_id || !body?.company_id) {
      return errorResponse('Missing round_id or company_id');
    }
    if (!Array.isArray(body.assignments) || body.assignments.length === 0) {
      return errorResponse('Missing or empty assignments[]');
    }

    // Verify caller is admin of company.
    const { data: membership } = await supabase
      .from('company_members')
      .select('role')
      .eq('company_id', body.company_id)
      .eq('user_id', inviter.id)
      .maybeSingle();

    if (!membership || !['owner', 'admin'].includes(membership.role)) {
      return errorResponse('Admin role required to delegate', 403);
    }

    // Verify round belongs to company.
    const { data: round } = await supabase
      .from('evaluation_rounds')
      .select('id, company_id, title, code')
      .eq('id', body.round_id)
      .single();

    if (!round || round.company_id !== body.company_id) {
      return errorResponse('Round not found or not in this company', 404);
    }

    // Get inviter name + company name for the email.
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', inviter.id)
      .maybeSingle();
    const inviterName = inviterProfile?.full_name ?? inviter.email ?? 'A teammate';

    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', body.company_id)
      .single();
    const companyName = company?.name ?? 'your organisation';

    const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://app.bds-os.example';
    const created: Array<{
      assignment_id: string;
      assignee_email: string;
      share_url: string;
      email_sent: boolean;
      email_error?: string;
    }> = [];

    for (const a of body.assignments) {
      const hasPractice = !!a.practice_id;
      const hasPillar = !!a.customer_pillar_id;
      if (hasPractice === hasPillar) {
        return errorResponse('Each assignment must have exactly one of practice_id or customer_pillar_id');
      }
      if (!a.assignee_email || !a.assignee_email.includes('@')) {
        return errorResponse(`Invalid email: ${a.assignee_email}`);
      }

      const { data: assignment, error: insertError } = await supabase
        .from('practice_assignments')
        .insert({
          round_id: body.round_id,
          company_id: body.company_id,
          practice_id: a.practice_id ?? null,
          customer_pillar_id: a.customer_pillar_id ?? null,
          assignee_email: a.assignee_email.trim().toLowerCase(),
          assignee_name: a.assignee_name ?? null,
          assigned_by: inviter.id,
          message: a.message ?? null,
          due_at: a.due_at ?? null,
        })
        .select('id, share_token, practice_id, customer_pillar_id')
        .single();

      if (insertError || !assignment) {
        return errorResponse(`Failed to create assignment: ${insertError?.message}`);
      }

      // Build a human description of the scope
      let scopeDescription = 'a brief assessment';
      if (assignment.customer_pillar_id) {
        const { data: pillar } = await supabase
          .from('customer_pillars')
          .select('label')
          .eq('id', assignment.customer_pillar_id)
          .single();
        if (pillar) scopeDescription = `the ${pillar.label} section of an assessment`;
      } else if (assignment.practice_id) {
        const { data: practice } = await supabase
          .from('practices')
          .select('statement')
          .eq('id', assignment.practice_id)
          .single();
        if (practice) {
          const truncated = practice.statement.length > 80
            ? practice.statement.slice(0, 80) + '…'
            : practice.statement;
          scopeDescription = `one practice: "${truncated}"`;
        }
      }

      const shareUrl = `${frontendUrl}/delegated/${assignment.share_token}`;

      const sendResult = await sendDelegationEmail({
        toEmail: a.assignee_email,
        toName: a.assignee_name ?? null,
        inviteUrl: shareUrl,
        inviterName,
        companyName,
        scopeDescription,
        message: a.message ?? null,
        dueAt: a.due_at ?? null,
      });

      created.push({
        assignment_id: assignment.id,
        assignee_email: a.assignee_email,
        share_url: shareUrl,
        email_sent: sendResult.ok,
        ...(sendResult.ok ? {} : { email_error: sendResult.error }),
      });
    }

    return jsonResponse({
      round_id: body.round_id,
      company_id: body.company_id,
      assignments: created,
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
