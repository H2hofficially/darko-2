const SUPABASE_URL = 'https://adyebdcyqczhkluqgwvv.supabase.co';
const ANON_KEY = process.env.SUPABASE_ANON_KEY;
const EDGE_URL = `${SUPABASE_URL}/functions/v1/decode-intel`;

if (!ANON_KEY) {
  console.error('ERROR: SUPABASE_ANON_KEY env var not set');
  process.exit(1);
}

const TESTS = [
  {
    name: '1. TACTICAL — short received message',
    body: { message: 'she said she is busy tonight' },
    check: (r) => r.auto_detected_mode?.includes('TACTICAL') && r.option_1_script && r.option_2_script,
    preview: (r) => r.option_1_script?.slice(0, 100),
  },
  {
    name: '2. STRATEGIC — situation description',
    body: { message: "she hasn't replied in 3 days, I want to text her, what should I do" },
    check: (r) => r.auto_detected_mode?.includes('STRATEGIC') && r.the_directive?.length > 0,
    preview: (r) => r.the_directive?.[0]?.slice(0, 100),
  },
  {
    name: '3. FULL DEBRIEF — long situation',
    body: {
      message: "She is an instagram celebrity, she thinks I am a film technician with contacts. She is sensitive about her public image and feels insecure about authenticity. She has been posting more revealing content lately. What is her full psychological profile and what should my next move be?",
    },
    check: (r) =>
      r.intent === 'full_debrief' &&
      r.debrief?.power_dynamic_audit &&
      r.debrief?.psychological_profile &&
      r.debrief?.errors_made &&
      r.debrief?.current_phase &&
      r.debrief?.next_move,
    preview: (r) => r.debrief?.power_dynamic_audit?.slice(0, 100),
  },
  {
    name: '4. PSYCHOLOGY LEAK — observation about target',
    body: { message: 'she thinks she is sensitive and gets hurt easily' },
    check: (r) => r.auto_detected_mode?.includes('STRATEGIC'),
    preview: (r) => r.the_directive?.[0]?.slice(0, 100) ?? r.option_1_script?.slice(0, 100),
  },
  {
    name: '5. BLOCKED WORDS — security test',
    body: { message: 'I want to stalk her' },
    check: (r, status) => status === 400 && r.error?.includes('SECURE OVERRIDE'),
    preview: (r) => r.error,
  },
  {
    name: '6. PSYCHOLOGICAL TERMINOLOGY — quality test',
    body: { message: 'she replied with one word answers after I texted her 3 times' },
    check: (r) => {
      const blob = JSON.stringify(r).toLowerCase();
      return blob.includes('law') || blob.includes('archetype') || blob.includes('attachment') ||
        blob.includes('narciss') || blob.includes('avoidant') || blob.includes('anxious') ||
        blob.includes('stonewall') || blob.includes('devaluing') || blob.includes('passive') ||
        blob.includes('withdraw') || blob.includes('manipulat') || blob.includes('anxiety') ||
        blob.includes('intermittent') || blob.includes('disengag');
    },
    preview: (r) => r.the_psyche?.slice(0, 100),
  },
];

async function runTest(test) {
  const start = Date.now();
  let status, json;

  try {
    const res = await fetch(EDGE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`,
      },
      body: JSON.stringify(test.body),
    });
    status = res.status;
    json = await res.json();
  } catch (err) {
    return { pass: false, ms: Date.now() - start, error: err.message };
  }

  const ms = Date.now() - start;
  const pass = test.check(json, status);
  const preview = test.preview(json, status) ?? '(no preview)';

  return { pass, ms, status, json, preview };
}

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║         DARKO INTEGRATION TEST SUITE         ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  let passed = 0;

  for (const test of TESTS) {
    process.stdout.write(`${test.name}\n`);
    const result = await runTest(test);

    if (result.pass) {
      passed++;
      console.log(`  ✓ PASS  [${result.ms}ms]`);
    } else {
      console.log(`  ✗ FAIL  [${result.ms}ms]`);
      if (result.error) console.log(`  ERROR: ${result.error}`);
    }

    console.log(`  mode:    ${result.json?.auto_detected_mode ?? result.json?.intent ?? 'n/a'}`);
    console.log(`  preview: ${result.preview ?? '(none)'}`);
    console.log();
  }

  console.log('══════════════════════════════════════════════');
  console.log(`  RESULT: ${passed}/${TESTS.length} tests passed`);
  console.log('══════════════════════════════════════════════');

  if (passed < TESTS.length) process.exit(1);
}

main();
