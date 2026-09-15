/**
 * Module 7 — Knowledge Base (design: knowledge.md). Searchable 1839→2026
 * archive with era timeline, graded citation cards, context rail.
 * Government entries always carry the "DOCUMENTED ≠ VALIDATED" chip.
 */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'framer-motion';
import { KNOWLEDGE_BASE, type KnowledgeCategory, type KnowledgeEntry } from '@/data/knowledge';
import { gatewayHistory } from '@/data/levels';
import { GradeBadge } from '@/ui/components/GradeBadge';
import { Chip } from '@/ui/components/primitives';
import { useIsMobile } from '@/hooks/use-mobile';
import { GRADE_COLOR, type GradeLetter } from '@/ui/theme';

const TYPE_CHIPS: (KnowledgeCategory | 'All')[] = ['All', 'myth-bust', 'evidence', 'safety', 'history'];

/** Era timeline anchors (knowledge.md §Hero Timeline). */
const ERAS: { year: string; label: string; grade: GradeLetter; gov?: boolean }[] = [
  { year: '1839', label: 'Dove discovers binaural beats', grade: 'A' },
  { year: '1852', label: 'Schumann predicts Earth-ionosphere resonance', grade: 'A' },
  { year: '1934', label: 'Adrian & Matthews — alpha EEG era', grade: 'A' },
  { year: '1973', label: 'Oster — Auditory Beats in the Brain', grade: 'A' },
  { year: '1975', label: 'Monroe patent US 3,884,218 (expired 1993)', grade: 'C' },
  { year: '1983', label: 'CIA Gateway assessment (CIA-RDP96-00788)', grade: 'D', gov: true },
  { year: '1999', label: 'Solfeggio numerology codified (Puleo/Horowitz)', grade: 'D' },
  { year: '2013', label: 'Ngo — closed-loop slow-wave stimulation', grade: 'B' },
  { year: '2023', label: 'Ingendoh meta-review: 8/14 EEG studies contradict', grade: 'C' },
  { year: '2025', label: '432 Hz RCT; NIH/DARPA basic-science funding', grade: 'B', gov: true },
];

export default function Knowledge() {
  const [query, setQuery] = useState('');
  const [type, setType] = useState<KnowledgeCategory | 'All'>('All');
  const [gradeFilter, setGradeFilter] = useState<GradeLetter | null>(null);
  const [selected, setSelected] = useState<KnowledgeEntry | null>(null);
  const isMobile = useIsMobile();
  const navigate = useNavigate();

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return KNOWLEDGE_BASE.filter((e) => {
      if (type !== 'All' && e.category !== type) return false;
      if (q && !`${e.title} ${e.claim} ${e.verdict}`.toLowerCase().includes(q)) return false;
      return true;
    }).map((e) => ({ entry: e, dimmed: gradeFilter !== null && e.grade !== gradeFilter }));
  }, [query, type, gradeFilter]);

  const govChip = (e: KnowledgeEntry) => e.id === 'history-cia-gateway';

  return (
    <div style={{ padding: isMobile ? '20px 16px 40px' : '32px 40px 48px', maxWidth: 1440, margin: '0 auto' }}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.24 }}>
        <h1 className="t-display-lg">Knowledge Base</h1>
        <p className="t-body text-2" style={{ marginTop: 8 }}>
          1839 → 2026. Every paper, patent, and program we cite — with a verdict.
        </p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="search papers, people, programs…"
          className="font-mono2"
          style={{
            width: '100%',
            background: 'var(--ink-3)',
            border: '1px solid var(--line-1)',
            borderRadius: 2,
            color: 'var(--text-1)',
            caretColor: 'var(--amber)',
            padding: '10px 14px',
            fontSize: 13,
            margin: '20px 0 12px',
          }}
        />
        <div className="flex items-center flex-wrap gap-2">
          {TYPE_CHIPS.map((c) => (
            <Chip key={c} active={type === c} onClick={() => setType(c)}>
              {c === 'All' ? 'ALL' : c.replace('-', ' ').toUpperCase()}
            </Chip>
          ))}
          <span className="t-label text-3" style={{ marginLeft: 12 }}>
            GRADE:
          </span>
          {(['A', 'B', 'C', 'D'] as GradeLetter[]).map((g) => (
            <Chip key={g} active={gradeFilter === g} color={GRADE_COLOR[g]} onClick={() => setGradeFilter(gradeFilter === g ? null : g)}>
              {g}
            </Chip>
          ))}
          <span className="t-readout-sm text-3" style={{ marginLeft: 'auto' }}>
            SHOWING {results.filter((r) => !r.dimmed).length} / {KNOWLEDGE_BASE.length} ENTRIES
          </span>
        </div>
      </motion.div>

      {/* Era timeline ribbon — horizontal touch scroll, era labels always visible below each node */}
      <div
        className="panel"
        style={{ padding: isMobile ? '16px 16px' : '20px 24px', margin: '24px 0', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}
        aria-label="Timeline 1839 to 2026"
      >
        {isMobile && (
          <div className="t-label text-3" style={{ marginBottom: 8 }}>
            SCROLL → 1839 → 2026
          </div>
        )}
        <div className="relative" style={{ minWidth: 900, height: 96 }}>
          <div style={{ position: 'absolute', top: 36, left: 0, right: 0, height: 1, background: 'var(--line-2)' }} />
          {ERAS.map((era, i) => {
            const x = (i / (ERAS.length - 1)) * 100;
            return (
              <div key={era.year} style={{ position: 'absolute', left: `${x}%`, top: 0, transform: 'translateX(-50%)', width: 120, textAlign: 'center' }}>
                <span className="t-readout-sm text-3">{era.year}</span>
                <div
                  title={`${era.label} — Grade ${era.grade}`}
                  style={{
                    width: 8,
                    height: 8,
                    margin: '7px auto',
                    background: GRADE_COLOR[era.grade],
                    cursor: 'pointer',
                  }}
                  onClick={() => {
                    const hit = KNOWLEDGE_BASE.find((e) =>
                      era.year === '1983' ? e.id === 'history-cia-gateway' : e.title.toLowerCase().includes(era.label.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '')),
                    );
                    if (hit) setSelected(hit);
                  }}
                />
                <span className="t-caption text-3" style={{ display: 'block', fontSize: 10, lineHeight: '13px' }}>
                  {era.label}
                </span>
                {era.gov && (
                  <span className="t-caption" style={{ color: 'var(--danger)', fontSize: 9 }}>
                    DOCUMENTED ≠ VALIDATED
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6" style={{ gridTemplateColumns: isMobile ? '1fr' : 'repeat(12, 1fr)' }}>
        {/* Results */}
        <div className="flex flex-col gap-3" style={{ gridColumn: isMobile ? 'span 1' : 'span 8', minWidth: 0 }}>
          {results.map(({ entry: e, dimmed }, i) => (
            <motion.article
              key={e.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: dimmed ? 0.3 : 1, y: 0 }}
              transition={{ duration: 0.2, delay: Math.min(i * 0.04, 0.4) }}
              className="panel panel-interactive"
              title={dimmed ? 'We dim, not delete: filtered-out entries stay visible.' : undefined}
              style={{ borderLeft: `2px solid ${GRADE_COLOR[e.grade]}`, padding: 20, cursor: 'pointer' }}
              onClick={() => setSelected(e)}
            >
              <div className="flex items-center gap-3" style={{ marginBottom: 8 }}>
                <GradeBadge grade={e.grade} compact citation={{ verdict: e.verdict.slice(0, 120), source: e.citations[0] }} />
                <span className="t-label text-3">{e.category.replace('-', ' ').toUpperCase()}</span>
                {govChip(e) && (
                  <span
                    className="t-label"
                    style={{ color: 'var(--danger)', border: '1px solid rgba(196,99,79,0.6)', borderRadius: 2, padding: '1px 6px', fontSize: 9 }}
                  >
                    DOCUMENTED ≠ VALIDATED
                  </span>
                )}
              </div>
              <h3 className="t-h3">{e.title}</h3>
              <p className="t-body-sm text-2" style={{ marginTop: 6 }}>
                <span className="text-3">Claim: </span>
                {e.claim}
              </p>
              <p className="t-body-sm" style={{ marginTop: 6, color: 'var(--text-1)' }}>
                {e.verdict}
              </p>
              {govChip(e) && (
                <p className="t-caption text-3" style={{ marginTop: 8, background: 'var(--ink-0)', padding: 8 }}>
                  Government interest documents <em>that</em> research happened. It is not evidence that the effect
                  works.
                </p>
              )}
              <p className="t-caption font-mono2 text-3" style={{ marginTop: 8 }}>
                ▸ {e.citations[0]}
              </p>
            </motion.article>
          ))}
        </div>

        {/* Context rail */}
        <div style={{ gridColumn: isMobile ? 'span 1' : 'span 4', minWidth: 0 }}>
          <div style={isMobile ? undefined : { position: 'sticky', top: 64 }}>
            <div className="panel">
              <span className="t-label">ENTRY DETAIL</span>
              {selected ? (
                <>
                  <h3 className="t-h3" style={{ margin: '12px 0 8px' }}>
                    {selected.title}
                  </h3>
                  <GradeBadge grade={selected.grade} citation={{ verdict: selected.verdict.slice(0, 120), source: selected.citations[0] }} />
                  <div style={{ background: 'var(--ink-0)', border: '1px solid var(--line-1)', padding: 16, margin: '12px 0' }}>
                    <p className="t-body text-2">{selected.verdict}</p>
                  </div>
                  {selected.id === 'history-cia-gateway' && (
                    <p className="t-body-sm text-2" style={{ marginBottom: 12 }}>
                      {gatewayHistory}
                    </p>
                  )}
                  {selected.citations.map((c) => (
                    <p key={c} className="t-caption font-mono2 text-3" style={{ marginBottom: 6 }}>
                      ▸ {c}
                    </p>
                  ))}
                </>
              ) : (
                <p className="t-body-sm text-3" style={{ marginTop: 12 }}>
                  Select an entry or a timeline node to read the full verdict and citations here.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="flex items-center gap-6 flex-wrap" style={{ borderTop: '1px solid var(--line-1)', marginTop: 40, paddingTop: 20 }}>
        {[
          [String(KNOWLEDGE_BASE.length), 'ENTRIES'],
          [String(KNOWLEDGE_BASE.filter((e) => e.category === 'evidence').length), 'EVIDENCE'],
          [String(KNOWLEDGE_BASE.filter((e) => e.category === 'myth-bust').length), 'MYTH-BUST'],
          ['1839→2026', 'SPAN'],
        ].map(([n, l]) => (
          <div key={l}>
            <div className="t-readout-lg">{n}</div>
            <div className="t-label">{l}</div>
          </div>
        ))}
        <a
          href="/about"
          className="t-caption"
          style={{ marginLeft: 'auto', color: 'var(--teal-hi)' }}
          onClick={(ev) => {
            ev.preventDefault();
            navigate('/about');
          }}
        >
          How we grade evidence → About/Method
        </a>
      </div>
    </div>
  );
}
