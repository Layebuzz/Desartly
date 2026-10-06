import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Award,
  Compass,
  Lock,
  Plus,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { personalities, serviceKeys } from "./growth-model.js";

function GrowthRing({ value = 0, max = 1, label }) {
  const percent = Math.max(0, Math.min(100, Math.round((value / (max || 1)) * 100)));
  return (
    <div
      className="growth-ring"
      role="progressbar"
      aria-label={label}
      aria-valuemin="0"
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={`${percent}%`}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle className="growth-ring-track" cx="50" cy="50" r="42" pathLength="100" />
        <circle
          className="growth-ring-value"
          cx="50"
          cy="50"
          r="42"
          pathLength="100"
          strokeDasharray={`${percent} 100`}
        />
      </svg>
      <strong>{percent}<small>%</small></strong>
    </div>
  );
}

export function DotPlot({ value = 0, max = 1, tone = 0, total = 12, label }) {
  const filled = Math.round((value / (max || 1)) * total);
  return (
    <div
      className={`growth-dot-plot tone-${tone}`}
      role="img"
      aria-label={`${label}: ${value} of ${max}`}
    >
      {Array.from({ length: total }, (_, index) => (
        <i className={index < filled ? "filled" : ""} key={index} />
      ))}
    </div>
  );
}

export function GrowthDashboard({ state }) {
  const g = state.growth;
  const [showAll, setShowAll] = useState(false);
  if (!g) return <p>Loading portfolio progress…</p>;

  const visibleAchievements = showAll
    ? g.achievements
    : g.achievements
        .slice()
        .sort((a, b) => b.current / b.target - a.current / a.target)
        .slice(0, 6);

  return (
    <>
      <section className="growth-hero">
        <div>
          <div className="growth-hero-labels">
            <span className="cms-eyebrow">PORTFOLIO INTELLIGENCE</span>
          </div>
          <h1>A clearer view of your practice.</h1>
          <p>
            See where your work is strongest, where the portfolio is becoming
            repetitive and which next move adds meaningful range.
          </p>
          <Link className="cms-primary" to="/studio/projects/new">
            <Plus size={17} />
            Start a project
          </Link>
        </div>
        <div className="growth-score">
          <GrowthRing value={g.coverage} max={g.target} label="Portfolio map coverage" />
          <b>Portfolio coverage</b>
          <small>
            {g.coverage} of {g.target} meaningful combinations filled
          </small>
        </div>
      </section>

      <div className="growth-discipline-stats">
        {serviceKeys.map((key, index) => {
          const count = g.counts?.[key] || 0;
          const percent = g.published ? Math.round((count / g.published) * 100) : 0;
          return (
            <article key={key} className={`discipline-stat discipline-${index}`}>
              <div className="discipline-stat-heading">
                <span>{key === "Communication Design" ? "Communication" : key}</span>
                <small>{percent}% of published work</small>
              </div>
              <strong>{String(count).padStart(2, "0")}</strong>
              <DotPlot
                value={count}
                max={g.published}
                tone={index}
                total={12}
                label={`${key} share of published work`}
              />
            </article>
          );
        })}
      </div>

      <div className="cms-stats growth-summary">
        {[
          [g.published, "Published projects"],
          [`${g.rows.filter((row) => row.total).length} / ${g.rows.length}`, "Industries represented"],
          [g.rows.filter((row) => !row.total).length, "Untouched industries"],
          [g.unassigned, "Projects to classify"],
        ].map(([value, label]) => (
          <div className="growth-stat" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>

      <section className="cms-panel growth-section growth-quests">
        <div className="cms-panel-head">
          <div>
            <span className="cms-eyebrow">RECOMMENDED NEXT MOVES</span>
            <h2>Build range with intention.</h2>
          </div>
          <Target size={22} />
        </div>
        <p>
          Recommendations come from gaps in the portfolio map, not generic
          market forecasts. Complete one by classifying or publishing relevant work.
        </p>
        <div className="growth-suggestions">
          {g.suggestions.map((suggestion, index) => (
            <article key={suggestion.industry + suggestion.personality}>
              <div className="growth-quest-topline">
                <span>MOVE {String(index + 1).padStart(2, "0")}</span>
              </div>
              <small>{suggestion.industry}</small>
              <h3>{suggestion.personalityName}</h3>
              <p>{suggestion.reason}</p>
              <Link
                to={`/studio/projects/new?industry=${encodeURIComponent(
                  suggestion.industry,
                )}&personality=${suggestion.personality}`}
              >
                Explore direction <ArrowUpRight size={16} />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="cms-panel growth-section" id="growth-map">
        <div className="cms-panel-head">
          <div>
            <span className="cms-eyebrow">INDUSTRY × PERSONALITY × DISCIPLINE</span>
            <h2>Your range, made visible.</h2>
          </div>
          <span className="growth-map-legend">B · Branding&nbsp;&nbsp; P · Product&nbsp;&nbsp; C · Communication</span>
        </div>
        <p>
          Each cell keeps three independent counters. Filled cells reveal
          existing strengths; empty cells reveal possible directions.
        </p>
        <div
          className="growth-matrix"
          role="region"
          aria-label="Industry and personality coverage"
          tabIndex={0}
        >
          <table>
            <thead>
              <tr>
                <th>Industry</th>
                {personalities.map((personality) => (
                  <th key={personality.id} title={personality.cue}>
                    {personality.name}
                  </th>
                ))}
                <th>Projects</th>
              </tr>
            </thead>
            <tbody>
              {g.rows.map((row) => (
                <tr key={row.industry} className={row.total ? "has-work" : ""}>
                  <th scope="row">
                    {row.industry}
                    <small>{row.covered}/5 personalities · {row.unassigned} unassigned</small>
                  </th>
                  {row.cells.map((cell) => (
                    <td key={cell.id}>
                      <div className="growth-cell-counts">
                        {serviceKeys.map((key, index) => {
                          const count = cell.counts?.[key] || 0;
                          const project = cell.projects.find(
                            (item) => item.discipline === key,
                          );
                          const content = (
                            <>
                              <small>{["B", "P", "C"][index]}</small>
                              <b>{count}</b>
                            </>
                          );
                          return project ? (
                            <Link
                              className={`service-count service-${index}`}
                              key={key}
                              title={`${key}: ${cell.projects
                                .filter((item) => item.discipline === key)
                                .map((item) => item.title)
                                .join(", ")}`}
                              aria-label={`${row.industry}, ${cell.name}: ${count} ${key} projects`}
                              to={`/studio/projects/${project.id}`}
                            >
                              {content}
                            </Link>
                          ) : (
                            <span
                              className={`service-count is-empty service-${index}`}
                              key={key}
                              aria-label={`${key}: 0 projects`}
                            >
                              {content}
                            </span>
                          );
                        })}
                      </div>
                    </td>
                  ))}
                  <td><strong>{row.total}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cms-panel growth-section" id="milestones">
        <div className="cms-panel-head">
          <div>
            <span className="cms-eyebrow">MILESTONES</span>
            <h2>Progress that compounds.</h2>
          </div>
          <Trophy size={22} />
        </div>
        <div className="growth-achievements">
          {visibleAchievements.map((achievement) => {
            const unlocked = achievement.current >= achievement.target;
            return (
              <article key={achievement.id} className={unlocked ? "unlocked" : ""}>
                <div className="growth-achievement-icon">
                  {unlocked ? <Trophy size={18} /> : <Lock size={18} />}
                </div>
                <span>{unlocked ? "UNLOCKED" : "IN PROGRESS"}</span>
                <h3>{achievement.title}</h3>
                <DotPlot
                  value={achievement.current}
                  max={achievement.target}
                  tone={unlocked ? 3 : 0}
                  total={8}
                  label={achievement.title}
                />
                <small>{achievement.current}/{achievement.target}</small>
              </article>
            );
          })}
        </div>
        <button onClick={() => setShowAll((visible) => !visible)}>
          {showAll ? "Show fewer" : "View all milestones"}
        </button>
      </section>

      <p className="growth-source">
        Framework:{" "}
        <a
          href="https://www.gsb.stanford.edu/faculty-research/publications/dimensions-brand-personality"
          target="_blank"
          rel="noreferrer"
        >
          Jennifer Aaker, Dimensions of Brand Personality (1997)
        </a>
        . Labels describe design intent, not a validated consumer-research
        score. Brief counts reflect saved CMS requests.
      </p>
    </>
  );
}
