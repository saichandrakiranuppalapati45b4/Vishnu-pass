import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://fyyilfwujicikshqfcul.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5eWlsZnd1amljaWtzaHFmY3VsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NTI5NDgsImV4cCI6MjA4ODQyODk0OH0.tBOFhir3vOME-Lc_O2KDqmS-w6ksamIviIXYKBZgev4';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testGuardFlow() {
  console.log('=== Starting Guard Registration & Auth Test ===');

  const testEmail = `guard_test_${Date.now()}@university.edu`;
  const initialPassword = 'GuardSecretPass@123';
  const testEmployeeId = `GUARD-T-${Date.now().toString().slice(-4)}`;

  // Step 1: Register Guard using edge function
  console.log(`1. Registering Guard (${testEmail}, ${testEmployeeId})...`);
  const createRes = await fetch(`${supabaseUrl}/functions/v1/create-guard-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      email: testEmail,
      password: initialPassword,
      fullName: 'Test Security Guard',
      employeeId: testEmployeeId,
      contactNumber: '+919876543210',
      emergencyName: 'Emergency Person',
      emergencyContact: '+919876543211',
      photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200'
    })
  });

  const createData = await createRes.json();
  if (!createRes.ok || createData.error) {
    console.error('FAIL: create guard error:', createData);
    process.exit(1);
  }
  console.log('SUCCESS: Guard created in Auth and DB with status:', createData.guard?.status);

  // Step 2: Guard logs in with email and password
  console.log('2. Guard logs in with email...');
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: initialPassword
  });

  if (signInErr) {
    console.error('FAIL: Guard login error:', signInErr);
    process.exit(1);
  }
  console.log('SUCCESS: Guard logged in! User ID:', signInData.user.id);

  // Step 3: Verify guard row in database
  const { data: dbGuard, error: dbErr } = await supabase
    .from('guards')
    .select('*')
    .eq('employee_id', testEmployeeId)
    .single();

  if (dbErr || !dbGuard) {
    console.error('FAIL: Guard record in DB missing:', dbErr);
    process.exit(1);
  }
  console.log('SUCCESS: Guard DB Record found:', {
    id: dbGuard.id,
    name: dbGuard.full_name,
    employeeId: dbGuard.employee_id,
    status: dbGuard.status
  });

  // Step 4: Clean up test guard
  console.log('4. Cleaning up test guard...');
  const deleteRes = await fetch(`${supabaseUrl}/functions/v1/delete-guard-user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`
    },
    body: JSON.stringify({
      id: signInData.user.id,
      employeeId: testEmployeeId,
      email: testEmail
    })
  });

  const deleteData = await deleteRes.json();
  console.log('SUCCESS: Guard deleted:', deleteData);

  console.log('\n========================================================');
  console.log('ALL GUARD CREATION & AUTHENTICATION TESTS PASSED!');
  console.log('========================================================\n');
}

testGuardFlow().catch(console.error);
