// BDS OS — Edge Function: Invite User
// POST { email, role }
// Caller must be authenticated and have role='admin' in their organization.
// Generates a secure token and creates an invitations row. Returns the invite URL
// for the admin to deliver out-of-band (email integration is a v1.1 add).

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

const INVITE_TTL_DAYS = 7;
const VALID_ROLES = ['admin', 'leader', 'functional_lead'] as const;

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
      .select('organization_id, role')
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

    const { error: auditError } = await supabase.from('audit_log').insert({
      organization_id: dbUser.organization_id,
      user_id: inviter.id,
      action: 'create',
      resource_type: 'invitation',
      resource_id: invitation.id,
      after: { email, role, expires_at: expiresAt.toISOString() },
      metadata: { source: 'edge_function:invite-user' },
    });
    if (auditError) {
      console.warn(`audit_log insert failed for invitation ${invitation.id}: ${auditError.message}`);
    }

    const frontendUrl = Deno.env.get('FRONTEND_URL') ?? 'https://app.bds-os.example';
    const inviteUrl = `${frontendUrl}/accept-invite?token=${encodeURIComponent(token)}`;

    return jsonResponse({
      invitation_id: invitation.id,
      invite_url: inviteUrl,
      email,
      role,
      expires_at: expiresAt.toISOString(),
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
