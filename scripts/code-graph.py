"""Refresh the owner-approved src/server/api graph without model/API calls.

Run with the interpreter recorded in graphify-out/.graphify_python.
Graphify outputs are development artifacts and are excluded from deployments.
"""
import json
from pathlib import Path
from datetime import datetime, timezone
from collections import Counter
from graphify.detect import detect, save_manifest
from graphify.extract import extract
from graphify.build import build_from_json
from graphify.cluster import cluster, score_all
from graphify.analyze import god_nodes, surprising_connections, suggest_questions
from graphify.report import generate
from graphify.export import to_json
from graphify.diagnostics import diagnose_extraction, format_diagnostic_report

root = Path(__file__).resolve().parent.parent
out = root / 'graphify-out'
out.mkdir(exist_ok=True)
corpus = {'files': {key: [] for key in ('code','document','paper','image','video')}, 'total_files': 0, 'total_words': 0, 'scan_root': str(root)}
unsupported = []
for scope in ('src','server','api'):
    detection = detect(root / scope)
    corpus['files']['code'].extend(detection['files']['code'])
    corpus['total_files'] += len(detection['files']['code'])
    corpus['total_words'] += detection['total_words']
    unsupported.extend(detection.get('unclassified', []))
result = extract([Path(path) for path in corpus['files']['code']], cache_root=root, parallel=False)
result.update(hyperedges=[], input_tokens=0, output_tokens=0)
graph = build_from_json(result, root=str(root), directed=False)
if not graph.number_of_nodes():
    raise SystemExit('Empty extraction: existing outputs were preserved.')
communities = cluster(graph)
scores = score_all(graph, communities)
labels = {}
for key, nodes in communities.items():
    files = Counter(Path(graph.nodes[node].get('source_file', '')).stem for node in nodes if graph.nodes[node].get('source_file'))
    main = files.most_common(1)[0][0] if files else 'External dependencies'
    labels[key] = main.replace('-', ' ').replace('_', ' ') + ' connections'
gods = god_nodes(graph)
surprises = surprising_connections(graph, communities)
questions = suggest_questions(graph, communities, labels)
health = diagnose_extraction(result, directed=False, root=str(root))
if not to_json(graph, communities, str(out / 'graph.json'), community_labels=labels):
    raise SystemExit('Graphify refused a smaller graph; existing outputs preserved.')
report = generate(graph, communities, scores, labels, gods, surprises, corpus, {'input':0,'output':0}, str(root), suggested_questions=questions)
report += '\n## Scope and extraction limits\n\nStructural AST only: src, server, api. No model calls; 0 extraction tokens. CSS and content JSON are not semantically interpreted.\n\n' + format_diagnostic_report(health)
(out / 'GRAPH_REPORT.md').write_text(report, encoding='utf-8')
(out / '.graphify_labels.json').write_text(json.dumps(labels))
(out / '.graphify_detect.json').write_text(json.dumps(corpus))
(out / '.graphify_root').write_text(str(root))
(out / 'health.json').write_text(json.dumps(health, indent=2))
save_manifest(corpus['files'], root=str(root), scan_corpus=set(corpus['files']['code']))
cost_path = out / 'cost.json'
cost = json.loads(cost_path.read_text()) if cost_path.exists() else {'runs':[], 'total_input_tokens':0, 'total_output_tokens':0}
cost['runs'].append({'date':datetime.now(timezone.utc).isoformat(), 'input_tokens':0, 'output_tokens':0, 'files':corpus['total_files'], 'scope':['src','server','api'], 'mode':'structural AST'})
cost_path.write_text(json.dumps(cost, indent=2))
print(f"{corpus['total_files']} source files; {graph.number_of_nodes()} nodes; {graph.number_of_edges()} edges; {len(communities)} communities; 0 LLM extraction tokens")
print(format_diagnostic_report(health))
