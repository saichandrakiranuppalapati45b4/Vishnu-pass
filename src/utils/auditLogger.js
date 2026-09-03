import { supabase } from '../config/supabase';

/**
 * Standard utility for logging administrative actions to the Supabase audit trail.
 * 
 * @param {Object} params
 * @param {string} params.action - Short description of the action (e.g., 'Registered Student')
 * @param {string} params.resource - The ID or name of the affected resource (e.g., student ID)
 * @param {Object} [params.details] - Optional JSON object with additional context
 */
export const logAuditAction = async ({ action, resource, details = {} }) => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        const logEntry = {
            admin_id: user?.id || null,
            admin_name: user?.user_metadata?.full_name || user?.email || 'Admin',
            action: action || 'Action',
            resource: resource || 'SYSTEM',
            details: details,
            ip_address: '127.0.0.1'
        };

        await supabase.from('audit_logs').insert([logEntry]);

    } catch (_error) {
        console.error("Failed to log audit action in Supabase:", _error);
    }
};
