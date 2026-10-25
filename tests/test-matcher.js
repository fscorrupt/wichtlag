// Integration test suite for WichtelMat
import { matchSecretSanta, validateDrawPossibility } from '../server/matcher.js';

async function runTests() {
  console.log('Testing derangement algorithm with exclusions...');

  const participants = [
    { id: '1', name: 'Anna' },
    { id: '2', name: 'Ben' },
    { id: '3', name: 'Clara' },
    { id: '4', name: 'David' }
  ];

  // Exclude Anna -> Ben and Ben -> Anna
  const exclusions = [
    { giver_name: 'Anna', receiver_name: 'Ben' },
    { giver_name: 'Ben', receiver_name: 'Anna' }
  ];

  const validation = validateDrawPossibility(participants, exclusions);
  if (!validation.possible) throw new Error('Validation failed');

  for (let i = 0; i < 50; i++) {
    const pairings = matchSecretSanta(participants, exclusions);
    if (!pairings) throw new Error('Matching returned null');

    // Rule checks
    for (const [giver, receiver] of Object.entries(pairings)) {
      if (giver === receiver) throw new Error(`Self-draw detected for ${giver}`);
    }

    if (pairings['1'] === '2') throw new Error('Anna drew Ben!');
    if (pairings['2'] === '1') throw new Error('Ben drew Anna!');
  }

  console.log('✓ 50/50 randomized derangements passed successfully with exclusions satisfied!');
}

runTests().catch(console.error);
