import fs from 'fs';
import path from 'path';
import { extractWithRegex } from '../services/regexExtractor';
import { allQueries, compareEntities, QueryTestCase } from './queryFixtures';

type Bucket = 'simple' | 'medium' | 'complex';

function complexityOf(q: QueryTestCase): Bucket {
  const count = q.expected?.entities ? Object.keys(q.expected.entities).length : 0;
  if (count <= 2) return 'simple';
  if (count === 3) return 'medium';
  return 'complex';
}

describe('Regex extractor accuracy report', () => {
  test('run regex on all queries and generate metrics', () => {
    const report = {
      total: 0,
      byBucket: {
        simple: { total: 0, correct: 0, partial: 0, incorrect: 0 },
        medium: { total: 0, correct: 0, partial: 0, incorrect: 0 },
        complex: { total: 0, correct: 0, partial: 0, incorrect: 0 },
      },
      falseNegatives: [] as any[],
      falsePositives: [] as any[],
    };

    for (const q of allQueries) {
      report.total++;
      const bucket: Bucket = complexityOf(q);
      report.byBucket[bucket].total++;

      const regexResult = extractWithRegex(q.query);
      const cmp = compareEntities(q.expected.entities || {}, regexResult.entities || {});
      report.byBucket[bucket][cmp]++;

      if (cmp === 'incorrect') {
        report.falseNegatives.push({
          id: q.id,
          query: q.query,
          expected: q.expected.entities,
          actual: regexResult.entities,
          matched_patterns: regexResult.matched_patterns,
          confidence: regexResult.confidence,
        });
      } else if (cmp === 'partial') {
        report.falsePositives.push({
          id: q.id,
          query: q.query,
          expected: q.expected.entities,
          actual: regexResult.entities,
          matched_patterns: regexResult.matched_patterns,
          confidence: regexResult.confidence,
        });
      }
    }

    // compute totals & percentages
    const summary = {
      total: report.total,
      simple: {
        total: report.byBucket.simple.total,
        accuracy: report.byBucket.simple.total
          ? (report.byBucket.simple.correct / report.byBucket.simple.total) * 100
          : 0,
      },
      medium: {
        total: report.byBucket.medium.total,
        accuracy: report.byBucket.medium.total
          ? (report.byBucket.medium.correct / report.byBucket.medium.total) * 100
          : 0,
      },
      complex: {
        total: report.byBucket.complex.total,
        accuracy: report.byBucket.complex.total
          ? (report.byBucket.complex.correct / report.byBucket.complex.total) * 100
          : 0,
      },
    };

    const out = { summary, report };
    const outDir = path.join(__dirname, '..', '..', 'test-output');
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    fs.writeFileSync(path.join(outDir, 'regex_accuracy.json'), JSON.stringify(out, null, 2), 'utf-8');

    // Basic assertions: ensure file produced and some minimal coverage
    expect(fs.existsSync(path.join(outDir, 'regex_accuracy.json'))).toBe(true);
    // optional: fail test if overall accuracy below threshold (adjust as needed)
    const overallCorrect = report.byBucket.simple.correct + report.byBucket.medium.correct + report.byBucket.complex.correct;
    const overallTotal = report.total;
    const overallAccuracy = overallTotal ? (overallCorrect / overallTotal) * 100 : 0;
    console.log(`Regex extractor overall accuracy: ${overallAccuracy.toFixed(1)}%`);
    // don't hard-fail; just write report — but you can set threshold:
    // expect(overallAccuracy).toBeGreaterThanOrEqual(70);
  }, 30000);
});