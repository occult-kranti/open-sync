/**
 * 'Soon' stub for the four research screens (Experiment Lab, Critique
 * Library, Hypothesis Tracker, Programs Archive). Another swarm fills these;
 * the rail links here so the shell is complete.
 */

import { Link } from 'react-router';

export default function ComingSoon({ title }: { title: string }) {
  return (
    <div style={{ padding: '96px 40px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
      <span className="t-label text-3">RESEARCH MODULE — COMING SOON</span>
      <h1 className="t-display-lg" style={{ margin: '12px 0' }}>
        {title}
      </h1>
      <p className="t-body text-2">
        This research screen is scheduled but not yet built. The eight core modules are live in the rail.
      </p>
      <Link to="/studio" className="chip" style={{ marginTop: 24, display: 'inline-flex', textDecoration: 'none' }}>
        BACK TO STUDIO
      </Link>
    </div>
  );
}
