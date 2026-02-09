
/**
 * Centralized Role Logic
 * Consistent seniority detection across the platform.
 */

export const SENIOR_KEYWORDS = [
    'senior',
    'sr.',
    'sr ',
    'lead',
    'principal',
    'staff',
    'architect',
    'manager',
    'head',
    'director',
    'vp',
    'chief'
];

export const JUNIOR_KEYWORDS = [
    'junior',
    'jr.',
    'jr ',
    'associate',
    'intern',
    'trainee'
];

export const isSenior = (role: string = ''): boolean => {
    const r = role.toLowerCase();
    return SENIOR_KEYWORDS.some(k => r.includes(k));
};

export const isJunior = (role: string = ''): boolean => {
    const r = role.toLowerCase();
    return JUNIOR_KEYWORDS.some(k => r.includes(k));
};

export const getRoleLevel = (role: string = ''): 'Senior' | 'Junior' | 'Mid' => {
    if (isSenior(role)) return 'Senior';
    if (isJunior(role)) return 'Junior';
    return 'Mid';
};
