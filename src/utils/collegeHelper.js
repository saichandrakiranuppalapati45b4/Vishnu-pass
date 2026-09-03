/**
 * Helper utility to safely resolve college ID and college Name from collegeData objects
 * that may contain collegeId, id, collegeName, name, or uid fields.
 */

export const getCid = (collegeData) => {
    if (!collegeData) return 'default_college';
    if (typeof collegeData === 'string') return collegeData.trim();
    return (collegeData.collegeId || collegeData.id || collegeData.collegeName || collegeData.name || collegeData.uid || 'default_college').toString().trim();
};

export const getCName = (collegeData) => {
    if (!collegeData) return 'default_college';
    if (typeof collegeData === 'string') return collegeData.trim();
    return (collegeData.collegeName || collegeData.name || collegeData.collegeId || collegeData.id || 'default_college').toString().trim();
};
