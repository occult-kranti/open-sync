import { describe, it, expect } from 'vitest';
import {
  KNOWLEDGE_BASE,
  getKnowledgeById,
  knowledgeByCategory,
  type KnowledgeCategory,
} from '../knowledge';
import type { Grade } from '../frequencies';

const GRADES: readonly Grade[] = ['A', 'B', 'C', 'D'];
const CATEGORIES: readonly KnowledgeCategory[] = ['myth-bust', 'evidence', 'safety', 'history'];

describe('KNOWLEDGE_BASE integrity', () => {
  it('has unique ids', () => {
    const ids = KNOWLEDGE_BASE.map((k) => k.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every entry has a valid category, grade, and non-empty claim/verdict/citations', () => {
    for (const k of KNOWLEDGE_BASE) {
      expect(CATEGORIES, k.id).toContain(k.category);
      expect(GRADES, k.id).toContain(k.grade);
      expect(k.title.trim().length, k.id).toBeGreaterThan(0);
      expect(k.claim.trim().length, k.id).toBeGreaterThan(0);
      expect(k.verdict.trim().length, k.id).toBeGreaterThan(0);
      expect(k.citations.length, k.id).toBeGreaterThan(0);
      for (const c of k.citations) expect(c.trim().length, k.id).toBeGreaterThan(0);
    }
  });

  it('covers all four categories', () => {
    for (const cat of CATEGORIES) {
      expect(knowledgeByCategory(cat).length, cat).toBeGreaterThan(0);
    }
  });

  it('ids are namespaced by category prefix', () => {
    for (const k of KNOWLEDGE_BASE) {
      const prefix = k.category === 'myth-bust' ? 'myth-' : `${k.category}-`;
      expect(k.id.startsWith(prefix), k.id).toBe(true);
    }
  });
});

describe('grade policy', () => {
  it('numerology/folklore myths are grade D', () => {
    for (const id of ['myth-solfeggio-medieval', 'myth-528-dna-repair', 'myth-chakra-hz', 'myth-schumann-spiking']) {
      expect(getKnowledgeById(id)?.grade, id).toBe('D');
    }
  });

  it('safety facts anchored in standards/measurement are grade A', () => {
    expect(getKnowledgeById('safety-infant-machines-loud')?.grade).toBe('A');
    expect(getKnowledgeById('safety-weekly-dose')?.grade).toBe('A');
  });

  it('medication-interaction entry is worded as precaution, not mechanism', () => {
    const k = getKnowledgeById('safety-medication-precaution');
    expect(k?.verdict.toLowerCase()).toContain('no peer-reviewed evidence');
    expect(k?.verdict.toLowerCase()).toContain('precaution');
  });

  it('CIA Gateway entry states the report contains no experiments', () => {
    const k = getKnowledgeById('history-cia-gateway');
    expect(k?.verdict).toContain('CIA-RDP96-00788R001700210016-5');
    expect(k?.verdict.toLowerCase()).toContain('no experiments');
  });
});

describe('helpers', () => {
  it('getKnowledgeById finds entries and returns undefined for misses', () => {
    expect(getKnowledgeById('evidence-40hz-unproven')?.category).toBe('evidence');
    expect(getKnowledgeById('missing')).toBeUndefined();
  });

  it('knowledgeByCategory preserves declaration order and returns copies', () => {
    const myths = knowledgeByCategory('myth-bust');
    const expected = KNOWLEDGE_BASE.filter((k) => k.category === 'myth-bust');
    expect(myths.map((k) => k.id)).toEqual(expected.map((k) => k.id));
  });
});
