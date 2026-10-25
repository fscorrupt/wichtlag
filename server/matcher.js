/**
 * Secret Santa matching algorithm with exclusion support.
 * Uses randomized backtracking to find a valid derangement (bijection without self-draw and respecting exclusions).
 */

/**
 * Shuffles an array in place using Fisher-Yates
 */
function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Checks if a permutation forms a single connected cycle (optional preference for Santa loops)
 */
function isSingleCycle(pairings) {
  const givers = Object.keys(pairings);
  if (givers.length === 0) return false;
  
  const visited = new Set();
  let current = givers[0];
  
  while (current && !visited.has(current)) {
    visited.add(current);
    current = pairings[current];
  }
  
  return visited.size === givers.length && current === givers[0];
}

/**
 * Attempts to find a Secret Santa draw matching all exclusions.
 * @param {Array<{id: string, name: string}>} participants 
 * @param {Array<{giver_name: string, receiver_name: string}>} exclusions 
 * @param {boolean} preferSingleCycle 
 * @returns {Record<string, string> | null} Mapping of giverId -> receiverId, or null if impossible
 */
export function matchSecretSanta(participants, exclusions = [], preferSingleCycle = true) {
  if (!participants || participants.length < 2) {
    return null;
  }

  const nameToId = new Map();
  const idToName = new Map();
  participants.forEach(p => {
    nameToId.set(p.name.toLowerCase().trim(), p.id);
    idToName.set(p.id, p.name);
  });

  // Build exclusion set: "giverId:receiverId"
  const exclusionSet = new Set();
  exclusions.forEach(ex => {
    const giverId = nameToId.get(ex.giver_name?.toLowerCase()?.trim());
    const receiverId = nameToId.get(ex.receiver_name?.toLowerCase()?.trim());
    if (giverId && receiverId) {
      exclusionSet.add(`${giverId}:${receiverId}`);
    }
  });

  const participantIds = participants.map(p => p.id);

  // We can attempt multiple randomized runs to find a single-cycle solution if preferred
  const maxAttempts = preferSingleCycle ? 100 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const givers = shuffle(participantIds);
    const availableReceivers = new Set(participantIds);
    const currentPairings = {};

    function backtrack(index) {
      if (index === givers.length) {
        return true;
      }

      const giver = givers[index];
      // Randomize receiver candidates for this giver
      const candidates = shuffle(Array.from(availableReceivers));

      for (const receiver of candidates) {
        // Rule 1: No self-draw
        if (giver === receiver) continue;

        // Rule 2: No exclusion
        if (exclusionSet.has(`${giver}:${receiver}`)) continue;

        // Try this assignment
        currentPairings[giver] = receiver;
        availableReceivers.delete(receiver);

        if (backtrack(index + 1)) {
          return true;
        }

        // Backtrack
        delete currentPairings[giver];
        availableReceivers.add(receiver);
      }

      return false;
    }

    const success = backtrack(0);
    if (success) {
      if (!preferSingleCycle || participants.length <= 2 || isSingleCycle(currentPairings)) {
        return currentPairings;
      }
    }
  }

  // If single cycle failed or was not found in attempts, fallback to any valid derangement
  const givers = shuffle(participantIds);
  const availableReceivers = new Set(participantIds);
  const fallbackPairings = {};

  function fallbackBacktrack(index) {
    if (index === givers.length) return true;
    const giver = givers[index];
    const candidates = shuffle(Array.from(availableReceivers));

    for (const receiver of candidates) {
      if (giver === receiver) continue;
      if (exclusionSet.has(`${giver}:${receiver}`)) continue;

      fallbackPairings[giver] = receiver;
      availableReceivers.delete(receiver);

      if (fallbackBacktrack(index + 1)) return true;

      delete fallbackPairings[giver];
      availableReceivers.add(receiver);
    }
    return false;
  }

  if (fallbackBacktrack(0)) {
    return fallbackPairings;
  }

  return null;
}

/**
 * Test if a valid draw is mathematically possible with the given participants and exclusions.
 */
export function validateDrawPossibility(participants, exclusions = []) {
  if (!participants || participants.length < 2) {
    return { possible: false, reason: 'Mindestens 2 Teilnehmer sind für eine Auslosung erforderlich.' };
  }

  const result = matchSecretSanta(participants, exclusions, false);
  if (!result) {
    return {
      possible: false,
      reason: 'Mit den aktuellen Ausschlüssen ist keine gültige Auslosung möglich. Bitte lockere die Ausschlussregeln.'
    };
  }

  return { possible: true };
}
