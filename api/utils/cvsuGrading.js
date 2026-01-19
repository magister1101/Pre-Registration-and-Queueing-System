/**
 * CVSU Grading System Utility
 * CVSU College Grading Scale (with decimals):
 * 1.0 - 1.5 = Perfect
 * 1.6 - 2.5 = Good
 * 2.6 - 3.0 = Pass
 * 3.1 - 5.0 = Failed
 */

/**
 * Validates if a grade is within CVSU acceptable range (1.0-5.0, with decimals) or a valid status string
 * @param {any} grade - The grade to validate
 * @returns {boolean} - True if valid, false otherwise
 */
exports.isValidCVSUGrade = (grade) => {
    const numGrade = parseFloat(grade);
    if (!isNaN(numGrade)) {
        return numGrade >= 1.0 && numGrade <= 5.0;
    }
    const status = String(grade).toLowerCase();
    return ['passed', 'failed', 'drop', 'dropped', 'inc'].includes(status);
};

/**
 * Checks if a grade/status is a failing or blocking state
 * @param {any} grade - The grade to check
 * @returns {boolean} - True if failing/blocking, false otherwise
 */
exports.isFailingGrade = (grade) => {
    const numGrade = parseFloat(grade);
    if (!isNaN(numGrade)) {
        return numGrade > 3.0 && numGrade <= 5.0;
    }
    const status = String(grade).toLowerCase();
    return ['failed', 'drop', 'dropped'].includes(status);
};

/**
 * Checks if a grade/status should make a student irregular (Fail or INC)
 * @param {any} grade - The grade to check
 * @returns {boolean} - True if irregular, false otherwise
 */
exports.isIrregularStatus = (grade) => {
    return exports.isFailingGrade(grade) || exports.isINC(grade);
};

/**
 * Checks if a grade/status is INC
 * @param {any} grade - The grade to check
 * @returns {boolean} - True if INC, false otherwise
 */
exports.isINC = (grade) => {
    if (grade === null || grade === undefined) return false;
    const status = String(grade).toLowerCase();
    return status === 'inc';
};

/**
 * Gets the grade description based on CVSU grading system
 * @param {any} grade - The grade
 * @returns {string} - Grade description
 */
exports.getGradeDescription = (grade) => {
    const numGrade = parseFloat(grade);

    if (isNaN(numGrade)) {
        const status = String(grade).toLowerCase();
        if (status === 'inc') return 'INC';
        if (status === 'drop' || status === 'dropped') return 'Dropped';
        if (status === 'failed') return 'Failed';
        if (status === 'passed') return 'Passed';
        return 'Invalid';
    }

    if (numGrade >= 1.0 && numGrade <= 1.5) return 'Perfect';
    if (numGrade >= 1.6 && numGrade <= 2.5) return 'Good';
    if (numGrade >= 2.6 && numGrade <= 3.0) return 'Pass';
    if (numGrade > 3.0 && numGrade <= 5.0) return 'Failed';

    return 'Invalid';
};

/**
 * Gets the color for displaying a grade badge
 * @param {any} grade - The grade
 * @returns {string} - Color name for badge
 */
exports.getGradeColor = (grade) => {
    const numGrade = parseFloat(grade);

    if (isNaN(numGrade)) {
        const status = String(grade).toLowerCase();
        if (status === 'inc') return 'orange';
        if (status === 'drop' || status === 'dropped' || status === 'failed') return 'red';
        if (status === 'passed') return 'green';
        return 'grey';
    }

    if (numGrade >= 1.0 && numGrade <= 3.0) return 'green';
    if (numGrade > 3.0 && numGrade <= 5.0) return 'red';

    return 'grey';
};

/**
 * Checks if a user has any failing grades in their courses
 * @param {Array} courses - Array of course objects with grade property
 * @returns {boolean} - True if user has any failing grade or dropped status
 */
exports.hasFailingGrades = (courses) => {
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
        return false;
    }

    return courses.some(course => {
        return exports.isFailingGrade(course.grade);
    });
};
/**
 * Checks if a user has any irregular grades (Fail, Drop, or INC)
 * @param {Array} courses - Array of course objects with grade property
 * @returns {boolean} - True if user has any irregular grade
 */
exports.hasIrregularGrades = (courses) => {
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
        return false;
    }

    return courses.some(course => {
        return exports.isIrregularStatus(course.grade);
    });
};
