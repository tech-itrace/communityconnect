import { classifyIntent } from '../services/intentClassifier';

describe('Intent Classifier', () => {
  test('classifies find_business', () => {
    const result = classifyIntent('Find a web developer in Chennai');
    expect(result.primary).toBe('find_business');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test('classifies find_peers', () => {
    const result = classifyIntent('1995 batch mechanical engineers');
    expect(result.primary).toBe('find_peers');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  test('classifies find_specific_person', () => {
    const result = classifyIntent('Find Rahul');
    expect(result.primary).toBe('find_specific_person');
  });

  test('classifies find_alumni_business', () => {
    const result = classifyIntent('1995 batch who are web developers');
    expect(result.primary).toBe('find_alumni_business');
    expect(result.confidence).toBeGreaterThan(0.5);
  });
});