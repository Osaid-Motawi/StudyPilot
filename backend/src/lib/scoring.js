'use strict';

/**
 * Deterministic scoring aggregator. The backend owns scoring for the two
 * objective question types (Constitution v1.2.0, Principle II):
 *   - mcq      -> lib/mcqScoring.scoreMcq
 *   - matching -> lib/matchingScoring.scoreMatching
 * Free-text types (fill_blank, essay) are graded by the agent, not here.
 */

const { scoreMcq } = require('./mcqScoring');
const { scoreMatching } = require('./matchingScoring');

module.exports = { scoreMcq, scoreMatching };
