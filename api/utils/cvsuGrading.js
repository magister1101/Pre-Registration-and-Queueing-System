/**
 * CVSU Grading System Utility
 * CVSU College Grading Scale (with decimals):
 * 1.0 - 1.5 = Perfect
 * 1.6 - 2.5 = Good
 * 2.6 - 3.0 = Pass
 * 3.1 - 5.0 = Failed
 */

/**
 * Validates if a grade is within CVSU acceptable range (1.0-5.0, with decimals)
 * @param {number} grade - The grade to validate
 * @returns {boolean} - True if valid, false otherwise
 */
exports.isValidCVSUGrade = (grade) => {
    const numGrade = parseFloat(grade);
    if (isNaN(numGrade)) return false;
    return numGrade >= 1.0 && numGrade <= 5.0;
};

/**
 * Checks if a grade is a failing grade (3.1-5.0)
 * @param {number} grade - The grade to check
 * @returns {boolean} - True if failing, false otherwise
 */
exports.isFailingGrade = (grade) => {
    const numGrade = parseFloat(grade);
    if (isNaN(numGrade)) return false;
    return numGrade >= 3.1 && numGrade <= 5.0;
};

/**
 * Gets the grade description based on CVSU grading system (with decimals)
 * @param {number} grade - The grade
 * @returns {string} - Grade description (Perfect, Good, Pass, or Failed)
 */
exports.getGradeDescription = (grade) => {
    const numGrade = parseFloat(grade);
    if (isNaN(numGrade)) return 'Invalid';
    
    if (numGrade >= 1.0 && numGrade <= 1.5) return 'Perfect';
    if (numGrade >= 1.6 && numGrade <= 2.5) return 'Good';
    if (numGrade >= 2.6 && numGrade <= 3.0) return 'Pass';
    if (numGrade >= 3.1 && numGrade <= 5.0) return 'Failed';
    
    return 'Invalid';
};

/**
 * Gets the color for displaying a grade badge (with decimals)
 * @param {number} grade - The grade
 * @returns {string} - Color name for badge
 */
exports.getGradeColor = (grade) => {
    const numGrade = parseFloat(grade);
    if (isNaN(numGrade)) return 'grey';
    
    if (numGrade >= 1.0 && numGrade <= 1.5) return 'green';      // Perfect
    if (numGrade >= 1.6 && numGrade <= 2.5) return 'blue';       // Good
    if (numGrade >= 2.6 && numGrade <= 3.0) return 'orange';     // Pass
    if (numGrade >= 3.1 && numGrade <= 5.0) return 'red';        // Failed
    
    return 'grey';
};

/**
 * Checks if a user has any failing grades in their courses
 * @param {Array} courses - Array of course objects with grade property
 * @returns {boolean} - True if user has any failing grade (3.1-5.0), false if all passed
 */
exports.hasFailingGrades = (courses) => {
    if (!courses || !Array.isArray(courses) || courses.length === 0) {
        return false; // No courses means no failing grades
    }
    
    return courses.some(course => {
        const grade = parseFloat(course.grade);
        return exports.isFailingGrade(grade);
    });
};
