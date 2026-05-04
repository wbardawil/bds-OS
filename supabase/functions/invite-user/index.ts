// BDS OS — Edge Function: Invite User
// POST { email, role }
// Caller must be authenticated and have role='admin' in their organization.
// Generates a secure token, creates an invitations row, and sends an invitation
// email via Resend. If email delivery fails, the invitation is still created and
// the URL is returned so the admin can deliver it out-of-band as a fallback.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

const INVITE_TTL_DAYS = 7;
const VALID_ROLES = ['admin', 'leader', 'functional_lead'] as const;

interface SendResult {
  ok: boolean;
  error?: string;
}

async function sendInvitationEmail(args: {
  toEmail: string;
  inviteUrl: string;
  inviterName: string;
  organizationName: string;
  role: string;
}): Promise<SendResult> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) return { ok: false, error: 'RESEND_API_KEY not configured' };

  const fromEmail = Deno.env.get('INVITE_FROM_EMAIL') ?? 'invites@bds-os.example';
  const subject = `${args.inviterName} invited you to ${args.organizationName} on BDS OS`;

  const html = `<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
    <h1 style="font-size: 22px; font-weight: 600; margin: 0 0 16px;">You're invited to ${args.organizationName}</h1>
    <p style="margin: 0 0 16px;"><strong>${args.inviterName}</strong> invited you to join <strong>${args.organizationName}</strong> on BDS OS as a <strong>${args.role}</strong>.</p>
    <p style="margin: 0 0 24px;">BDS OS is the operating compass your team uses to run the company. Click below to set up your account.</p>
    <p style="margin: 0 0 24px;">
      <a href="${args.inviteUrl}" style="display: inline-block; background: #1a1a1a; color: #fff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 500;">Accept invitation</a>
    </p>
    <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Or copy this URL into your browser:</p>
    <p style="margin: 0 0 24px; font-size: 14px; color: #666; word-break: break-all;">${args.inviteUrl}</p>
    <p style="margin: 0; font-size: 13px; color: #999;">This invitation expires in ${INVITE_TTL_DAYS} days.</p>
  </body>
</html>`;

  const text = `${args.inviterName} invited you to join ${args.organizationName} on BDS OS as a ${args.role}.

BDS OS is the operating compass your team uses to run the company. Visit the link below to set up your account:

${args.inviteUrl}

This invitation expires in ${INVITE_TTL_DAYS} days.`;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
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
      const body = await response.text();
      return { ok: false, error: `Resend API ${response.status}: ${body}` };
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

    const { data: dbUser, error: dbUserError } = await supabase
      .from('users')
      .select('organization_id, role, name, organizations!inner(name)')
      .eq('id', inviter.id)
      .single();

    if (dbUserError || !dbUser) return errorResponse('User not found in organization', 403);
    if (dbUser.role !== 'admin') return errorResponse('Admin role required to invite', 403);

    const body = await req.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const role = body.role;

    if (!email || !email.includes('@')) return errorResponse('Valid email required');
    if (!VALID_ROLES.includes(role)) return errorResponse('Invalid role');

    const token = crypto.randomUUID() + '-' + crypto.randomUUID();
    const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

    const { data: invitation, error: insertError } = await supabase
      .from('invitations')
      .insert({
        organization_id: dbUser.organization_id,
        email,
        role,
        token,
        invited_by: inviter.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (insertError) return errorResponse(`Failed to create invitation: ${insertError.message}`);

    const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://app.bds-os.example';
    const inviteUrl = `${frontendUrl}/accept-invite?token=${encodeURIComponent(token)}`;

    const organizationName = (dbUser.organizations as unknown as { name: string }).name ?? 'your organization';
    const inviterName = dbUser.name ?? inviter.email ?? 'A teammate';

    const sendResult = await sendInvitationEmail({
      toEmail: email,
      inviteUrl,
      inviterName,
      organizationName,
      role,
    });

    if (!sendResult.ok) {
      console.warn(`invite-user: email send failed for ${email}: ${sendResult.error}`);
    }

    const { error: auditError } = await supabase.from('audit_log').insert({
      organization_id: dbUser.organization_id,
      user_id: inviter.id,
      action: 'create',
      resource_type: 'invitation',
      resource_id: invitation.id,
      after: { email, role, expires_at: expiresAt.toISOString() },
      metadata: {
        source: 'edge_function:invite-user',
        email_sent: sendResult.ok,
        email_error: sendResult.ok ? undefined : sendResult.error,
      },
    });
    if (auditError) {
      console.warn(`audit_log insert failed for invitation ${invitation.id}: ${auditError.message}`);
    }

    return jsonResponse({
      invitation_id: invitation.id,
      email,
      role,
      expires_at: expiresAt.toISOString(),
      email_sent: sendResult.ok,
      // Fallback URL only when email failed — UI should not surface unless email_sent is false
      ...(sendResult.ok ? {} : { invite_url: inviteUrl, email_error: sendResult.error }),
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
