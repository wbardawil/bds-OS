// BDS OS — Edge Function: Accept Invitation
// POST { token }
// Caller must be authenticated (just signed up via Supabase Auth or signed in).
// Validates the token, ensures the email matches the authenticated user, then
// creates a users row linked to auth.users and marks the invitation accepted.

import { createServiceClient } from '../shared/supabase-client.ts';
import { corsResponse, jsonResponse, errorResponse } from '../shared/cors.ts';

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return corsResponse();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return errorResponse('Missing Authorization header', 401);

    const supabase = createServiceClient();
    const jwt = authHeader.replace(/^Bearer\s+/i, '');

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) return errorResponse('Invalid token', 401);
    const acceptingUser = authData.user;

    const body = await req.json();
    const inviteToken = typeof body.token === 'string' ? body.token : '';
    if (!inviteToken) return errorResponse('Missing token');

    const { data: invitation, error: lookupError } = await supabase
      .from('invitations')
      .select('*')
      .eq('token', inviteToken)
      .single();

    if (lookupError || !invitation) return errorResponse('Invitation not found', 404);
    if (invitation.accepted_at) return errorResponse('Invitation already accepted', 410);
    if (new Date(invitation.expires_at) < new Date()) return errorResponse('Invitation expired', 410);

    if (invitation.email.toLowerCase() !== (acceptingUser.email ?? '').toLowerCase()) {
      return errorResponse('Invitation email does not match authenticated user', 403);
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id, organization_id')
      .eq('id', acceptingUser.id)
      .maybeSingle();

    if (existingUser) return errorResponse('User already a member of an organization', 409);

    const displayName =
      (acceptingUser.user_metadata?.name as string | undefined) ?? acceptingUser.email ?? 'New User';

    const { error: createError } = await supabase
      .from('users')
      .insert({
        id: acceptingUser.id,
        organization_id: invitation.organization_id,
        name: displayName,
        email: acceptingUser.email,
        role: invitation.role,
      });

    if (createError) return errorResponse(`Failed to create user: ${createError.message}`);

    const acceptedAt = new Date().toISOString();
    const { error: markError } = await supabase
      .from('invitations')
      .update({ accepted_at: acceptedAt })
      .eq('id', invitation.id);

    if (markError) {
      console.warn(`Failed to mark invitation ${invitation.id} accepted: ${markError.message}`);
    }

    const { error: auditError } = await supabase.from('audit_log').insert({
      organization_id: invitation.organization_id,
      user_id: acceptingUser.id,
      action: 'approve',
      resource_type: 'invitation',
      resource_id: invitation.id,
      before: { accepted_at: null },
      after: { accepted_at: acceptedAt, accepted_by: acceptingUser.id },
      metadata: { source: 'edge_function:accept-invitation' },
    });
    if (auditError) {
      console.warn(`audit_log insert failed for invitation ${invitation.id}: ${auditError.message}`);
    }

    return jsonResponse({
      user_id: acceptingUser.id,
      organization_id: invitation.organization_id,
      role: invitation.role,
    });
  } catch (err) {
    return errorResponse(`Internal error: ${(err as Error).message}`, 500);
  }
});
