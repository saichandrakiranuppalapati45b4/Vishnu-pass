const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const jwt = require("jsonwebtoken");

admin.initializeApp();

// Secret from Google Cloud Secret Manager
const jwtSecret = defineSecret("JWT_SECRET");

exports.generateQrToken = onCall({ secrets: [jwtSecret] }, async (request) => {
    // 1. Verify Firebase Authentication
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated to generate QR.');
    }

    const uid = request.auth.uid;
    const db = admin.firestore();

    // 2. Fetch User Profile
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        throw new HttpsError('not-found', 'User profile not found.');
    }

    const userData = userDoc.data();

    // 3. Verify user's role is student
    if (userData.role !== 'student') {
        throw new HttpsError('permission-denied', 'Only students can generate QR passes.');
    }

    // 4. Verify college and student status
    const collegeId = userData.collegeId;
    if (!collegeId) {
        throw new HttpsError('failed-precondition', 'Student is not assigned to a college.');
    }

    const collegeDoc = await db.collection('colleges').doc(collegeId).get();
    if (!collegeDoc.exists || collegeDoc.data().status === 'suspended') {
        throw new HttpsError('permission-denied', 'College is suspended or inactive.');
    }

    // The studentId might be stored inside the user's profile, or we need to query the subcollection
    // Wait, the schema says: colleges/{collegeId}/students/{studentId}
    // But how do we know the studentId from the uid? 
    // It should be saved in `users/{uid}` as `studentId` or we query where uid == uid
    const studentQuery = await db.collection(`colleges/${collegeId}/students`)
        .where('uid', '==', uid)
        .limit(1)
        .get();

    if (studentQuery.empty) {
        throw new HttpsError('not-found', 'Student record not found in college.');
    }

    const studentDoc = studentQuery.docs[0];
    const studentData = studentDoc.data();

    if (studentData.status === 'inactive' || studentData.status === 'suspended') {
        throw new HttpsError('permission-denied', 'Student account is not active.');
    }

    // 5. Generate cryptographically secure temporary token
    // 6. Set expiration to 30 seconds
    const payload = {
        tokenId: db.collection('dummy').doc().id, // Random unique ID
        studentUid: uid,
        studentId: studentDoc.id,
        collegeId: collegeId,
        issuedAt: Date.now(),
        // 30s expiry is handled by jwt internally but we add metadata
    };

    const token = jwt.sign(payload, jwtSecret.value(), { expiresIn: '30s' });

    // 7. Return the token payload to the frontend
    return {
        token,
        expiresIn: 30, // seconds
        issuedAt: payload.issuedAt
    };
});

exports.verifyQrToken = onCall({ secrets: [jwtSecret] }, async (request) => {
    // 1. Verify caller is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated to scan QR.');
    }

    const { token, gateId, movementType = 'IN' } = request.data;
    if (!token) {
        throw new HttpsError('invalid-argument', 'QR token is required.');
    }

    const guardUid = request.auth.uid;
    const db = admin.firestore();

    // 2. Fetch Guard Profile
    const guardUserDoc = await db.collection('users').doc(guardUid).get();
    if (!guardUserDoc.exists) {
        throw new HttpsError('not-found', 'Guard profile not found.');
    }
    const guardData = guardUserDoc.data();
    if (guardData.role !== 'guard') {
        throw new HttpsError('permission-denied', 'Only guards can verify QR passes.');
    }
    const guardCollegeId = guardData.collegeId;

    // 3. Decode and verify JWT
    let payload;
    try {
        payload = jwt.verify(token, jwtSecret.value());
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return { status: 'EXPIRED', message: 'QR Code has expired. Please ask student to refresh.' };
        }
        return { status: 'INVALID', message: 'Invalid or corrupted QR Code.' };
    }

    const { studentUid, studentId, collegeId } = payload;

    // 4. Cross-college isolation check
    if (collegeId !== guardCollegeId) {
        return { status: 'CROSS_COLLEGE_DENIED', message: 'This pass belongs to another institution.' };
    }

    // 5. Fetch Student Details
    const studentDoc = await db.collection(`colleges/${collegeId}/students`).doc(studentId).get();
    if (!studentDoc.exists) {
        return { status: 'INVALID', message: 'Student record not found.' };
    }
    const studentData = studentDoc.data();

    if (studentData.status === 'inactive' || studentData.status === 'suspended') {
        return { status: 'DENIED', message: 'Student account is not active.' };
    }

    // 6. Create Scan Log
    const scanLog = {
        studentId: studentData.student_id,
        studentUid: studentUid,
        studentName: studentData.full_name,
        photoUrl: studentData.photo_url || null,
        gateId: gateId || guardData.gate_id || 'UNKNOWN_GATE',
        guardUid: guardUid,
        guardName: guardData.full_name || 'Guard',
        movementType: movementType,
        status: 'completed', // or 'approved'
        warning: studentData.status === 'warning' ? 'Requires manual check' : null,
        scannedAt: admin.firestore.FieldValue.serverTimestamp(),
        timestamp: Date.now(),
        method: 'QR_SCAN'
    };

    const scanDocRef = await db.collection(`colleges/${collegeId}/scanLogs`).add(scanLog);

    // 7. Return safe data
    return {
        status: 'VALID',
        message: 'Pass verified successfully.',
        scanId: scanDocRef.id,
        student: {
            fullName: studentData.full_name,
            studentId: studentData.student_id,
            photoUrl: studentData.photo_url,
            department: studentData.departments?.name || studentData.department || 'General',
            yearOfStudy: studentData.year_of_study,
            hostelType: studentData.hostel_type,
            warning: scanLog.warning
        }
    };
});

exports.createStudentAccount = onCall(async (request) => {
    // 1. Verify caller is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const adminUid = request.auth.uid;
    const db = admin.firestore();

    // 2. Fetch Caller Profile to verify college_admin
    const adminDoc = await db.collection('users').doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'college_admin') {
        throw new HttpsError('permission-denied', 'Only college admins can create student accounts.');
    }

    const collegeId = adminDoc.data().collegeId;
    if (!collegeId) {
        throw new HttpsError('failed-precondition', 'Admin is not assigned to a college.');
    }

    const { email, password, studentData } = request.data;
    if (!email || !password || !studentData || !studentData.student_id) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    try {
        // 3. Create Firebase Auth user
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: studentData.full_name
        });

        const newUid = userRecord.uid;

        // 4. Create User Record (for Role)
        await db.collection('users').doc(newUid).set({
            role: 'student',
            collegeId: collegeId,
            email: email,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 5. Create Student Record in College scope
        const newStudentRef = db.collection(`colleges/${collegeId}/students`).doc();
        await newStudentRef.set({
            ...studentData,
            uid: newUid,
            email: email,
            status: 'active',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, uid: newUid, docId: newStudentRef.id };
    } catch (error) {
        console.error("Error creating student:", error);
        throw new HttpsError('internal', error.message || 'Failed to create student account.');
    }
});

exports.createGuardAccount = onCall(async (request) => {
    // 1. Verify caller is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const adminUid = request.auth.uid;
    const db = admin.firestore();

    // 2. Fetch Caller Profile to verify college_admin
    const adminDoc = await db.collection('users').doc(adminUid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'college_admin') {
        throw new HttpsError('permission-denied', 'Only college admins can create guard accounts.');
    }

    const collegeId = adminDoc.data().collegeId;
    if (!collegeId) {
        throw new HttpsError('failed-precondition', 'Admin is not assigned to a college.');
    }

    const { email, password, guardData } = request.data;
    if (!email || !password || !guardData || !guardData.employee_id) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    try {
        // 3. Create Firebase Auth user
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: guardData.full_name
        });

        const newUid = userRecord.uid;

        // 4. Create User Record (for Role)
        await db.collection('users').doc(newUid).set({
            role: 'guard',
            collegeId: collegeId,
            email: email,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 5. Create Guard Record in College scope
        const newGuardRef = db.collection(`colleges/${collegeId}/guards`).doc();
        await newGuardRef.set({
            ...guardData,
            uid: newUid,
            email: email,
            status: 'active',
            created_at: admin.firestore.FieldValue.serverTimestamp(),
            updated_at: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, uid: newUid, docId: newGuardRef.id };
    } catch (error) {
        console.error("Error creating guard:", error);
        throw new HttpsError('internal', error.message || 'Failed to create guard account.');
    }
});

exports.createCollegeAdminAccount = onCall(async (request) => {
    // 1. Verify caller is authenticated
    if (!request.auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const adminUid = request.auth.uid;
    const db = admin.firestore();

    // 2. Fetch Caller Profile to verify platform_admin or college_admin with manageAdmins permission
    const adminDoc = await db.collection('users').doc(adminUid).get();
    if (!adminDoc.exists) {
        throw new HttpsError('permission-denied', 'Admin profile not found.');
    }

    const callerRole = adminDoc.data().role;
    let targetCollegeId = request.data.collegeId;

    if (callerRole === 'platform_admin') {
        // Platform admin can specify collegeId
        if (!targetCollegeId) {
            throw new HttpsError('invalid-argument', 'collegeId must be provided by platform_admin.');
        }
    } else if (callerRole === 'college_admin') {
        // College admin can only create in their own college
        targetCollegeId = adminDoc.data().collegeId;
        if (!targetCollegeId) {
            throw new HttpsError('failed-precondition', 'Admin is not assigned to a college.');
        }
    } else {
        throw new HttpsError('permission-denied', 'Only platform or college admins can create admin accounts.');
    }

    const { email, password, adminData } = request.data;
    if (!email || !password || !adminData) {
        throw new HttpsError('invalid-argument', 'Missing required fields.');
    }

    try {
        // 3. Create Firebase Auth user
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: adminData.name || 'College Admin'
        });

        const newUid = userRecord.uid;

        // 4. Create User Record (for Role)
        await db.collection('users').doc(newUid).set({
            role: 'college_admin',
            collegeId: targetCollegeId,
            email: email,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        // 5. Create Admin Record in College scope
        const newAdminRef = db.collection(`colleges/${targetCollegeId}/admins`).doc(newUid);
        await newAdminRef.set({
            ...adminData,
            uid: newUid,
            email: email,
            status: 'active',
            createdAt: admin.firestore.FieldValue.serverTimestamp()
        });

        return { success: true, uid: newUid };
    } catch (error) {
        console.error("Error creating admin:", error);
        throw new HttpsError('internal', error.message || 'Failed to create admin account.');
    }
});
