import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fyyilfwujicikshqfcul.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eWlsZnd1amljaWtzaHFmY3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTI5NDgsImV4cCI6MjA4ODQyODk0OH0.tBOFhir3vOME-Lc_O2KDqmS-w6ksamIviIXYKBZgev4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testStorageUpload() {
  console.log('--- Testing Storage Upload as Student ---');

  // 1. Create a temporary student
  const testEmail = `storage_test_${Date.now()}@university.edu`;
  const initialPassword = 'Password@123';
  const testStudentId = `ST-${Date.now().toString().slice(-6)}`;

  console.log('1. Creating test student...');
  const createRes = await fetch(`${supabaseUrl}/functions/v1/create-student-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
      fullName: 'Storage Test Student',
      studentId: testStudentId,
      gender: 'male',
      yearOfStudy: '2',
      hostelType: 'hosteler',
      batch: '2024'
    })
  });
  const createData = await createRes.json();
  if (!createRes.ok || createData.error) {
    throw new Error(`Failed to create student: ${JSON.stringify(createData)}`);
  }

  // 2. Sign in as student with client
  console.log('2. Signing in as student...');
  const { data: authData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: initialPassword
  });

  if (signInErr) throw signInErr;
  console.log('Signed in as:', authData.user.id);

  // 3. Test Storage upload with upsert: true
  console.log('3. Uploading dummy image to storage bucket "students" with upsert: true...');
  const dummyImageBuffer = Buffer.from('fake-image-content-bytes-12345');
  const fileName = `student_test_${Date.now()}.png`;

  const { data: uploadData, error: uploadErr } = await supabase.storage
    .from('students')
    .upload(fileName, dummyImageBuffer, {
      contentType: 'image/png',
      upsert: true
    });

  if (uploadErr) {
    console.error('FAILED: Storage upload error:', uploadErr);
    throw uploadErr;
  }

  console.log('SUCCESS: File uploaded:', uploadData);

  // 4. Get Public URL
  const { data: { publicUrl } } = supabase.storage
    .from('students')
    .getPublicUrl(fileName);
  console.log('SUCCESS: Public URL generated:', publicUrl);

  // 5. Clean up file
  console.log('5. Deleting test uploaded file...');
  const { error: deleteErr } = await supabase.storage
    .from('students')
    .remove([fileName]);
  if (deleteErr) console.warn('Warning deleting test file:', deleteErr);
  else console.log('SUCCESS: Test file deleted from storage.');

  // 6. Clean up student
  console.log('6. Cleaning up student user...');
  await fetch(`${supabaseUrl}/functions/v1/delete-student-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      id: authData.user.id,
      studentId: testStudentId,
      email: testEmail
    })
  });

  console.log('\n>>> STORAGE RLS VERIFICATION COMPLETED SUCCESSFULLY! <<<');
}

testStorageUpload().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
