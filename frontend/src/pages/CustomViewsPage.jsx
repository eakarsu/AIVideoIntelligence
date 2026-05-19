// CustomViewsPage — mounts 4 VideoAI Views components (2 VIZ + 2 NON-VIZ)
import React from 'react';
import DetectionTimeline from '../components/DetectionTimeline';
import SceneHeatmap from '../components/SceneHeatmap';
import AnalysisReportPDF from '../components/AnalysisReportPDF';
import DetectionRulesEditor from '../components/DetectionRulesEditor';

export default function CustomViewsPage() {
  return (
    <div data-testid="custom-views-page" style={{ padding: 4, maxWidth: 1200 }}>
      <div style={{ marginBottom: 16 }}>
        <h1 style={{ color: '#e2e8f0', fontSize: 22, margin: 0 }}>VideoAI Views</h1>
        <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>
          Custom video intelligence: live timeline, scene heatmap, PDF reports, and detection rules.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <DetectionTimeline />
        <SceneHeatmap />
      </div>

      <AnalysisReportPDF />
      <DetectionRulesEditor />
    </div>
  );
}
