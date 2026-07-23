import { db, auth } from '../config/firebase';
import { collection, addDoc } from 'firebase/firestore';

/**
 * Standard utility for logging administrative actions to the system audit trail.
 * 
 * @param {Object} params
 * @param {string} params.action - Short description of the action (e.g., 'Registered Student')
 * @param {string} params.resource - The ID or name of the affected resource (e.g., student ID)
 * @param {Object} [params.details] - Optional JSON object with additional context
 * @param {string} params.collegeId - The college ID to log the action under
 */
export const logAuditAction = async ({ action, resource, details = {}, collegeId }) => {
    try {
        if (!collegeId) {
            console.warn("Audit logger skipped: collegeId is required.");
            return;
        }

        const currentUser = auth.currentUser;
        if (!currentUser) {
            return;
        }

        const logEntry = {
            adminId: currentUser.uid,
            adminName: currentUser.displayName || currentUser.email || 'Anonymous Admin',
            action: action,
            resource: resource,
            details: details,
            createdAt: new Date()
        };

        const logsRef = collection(db, `colleges/${collegeId}/audit_logs`);
        await addDoc(logsRef, logEntry);

    } catch (_error) {
        console.error("Failed to log audit action:", _error);
        // Silently fail audit logging to avoid disrupting user operations
    }
};
