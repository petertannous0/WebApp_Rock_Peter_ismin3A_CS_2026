import type { Violation } from '../types';

/**
 * The broken rules, one sentence each. Blocking ones first in red, warnings
 * in orange: the admin can only override the warnings (decision P5-a).
 */
export const ViolationList = ({ violations }: { violations: Violation[] }) => {
  const sorted = [...violations].sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'BLOCKING' ? -1 : 1));
  return (
    <ul className="violations" aria-label="Conflits">
      {sorted.map((violation, i) => (
        <li key={`${violation.rule}-${i}`} className={violation.severity === 'BLOCKING' ? 'violation blocking' : 'violation warning'}>
          <strong>{violation.severity === 'BLOCKING' ? 'Bloquant' : 'Avertissement'}</strong> {violation.message}
        </li>
      ))}
    </ul>
  );
};
