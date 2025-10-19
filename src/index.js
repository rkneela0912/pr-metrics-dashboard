const core = require('@actions/core');
const github = require('@actions/github');
const fs = require('fs');

async function run() {
  try {
    const token = core.getInput('github_token', { required: true });
    const days = parseInt(core.getInput('days') || '30');
    const outputFile = core.getInput('output_file') || 'PR_METRICS.md';
    const includeCharts = core.getInput('include_charts') !== 'false';
    
    const octokit = github.getOctokit(token);
    const { owner, repo } = github.context.repo;
    
    core.info(`📊 Generating PR metrics for the last ${days} days...`);
    
    const since = new Date();
    since.setDate(since.getDate() - days);
    
    // Fetch all PRs (both open and closed) from the time period
    const allPRs = [];
    let page = 1;
    let hasMore = true;
    
    while (hasMore) {
      const { data: openPRs } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        per_page: 100,
        page,
        sort: 'created',
        direction: 'desc'
      });
      
      const { data: closedPRs } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'closed',
        per_page: 100,
        page,
        sort: 'updated',
        direction: 'desc'
      });
      
      const prs = [...openPRs, ...closedPRs].filter(pr => {
        const createdAt = new Date(pr.created_at);
        return createdAt >= since;
      });
      
      allPRs.push(...prs);
      
      if (prs.length < 100) {
        hasMore = false;
      } else {
        page++;
      }
    }
    
    core.info(`Found ${allPRs.length} PRs in the last ${days} days`);
    
    // Calculate metrics
    const metrics = calculateMetrics(allPRs, since);
    
    // Generate report
    const report = generateReport(metrics, days, owner, repo, includeCharts);
    
    // Write to file
    fs.writeFileSync(outputFile, report);
    core.info(`✅ Metrics report written to ${outputFile}`);
    
    // Set outputs
    core.setOutput('total_prs', metrics.totalPRs.toString());
    core.setOutput('merged_prs', metrics.mergedPRs.toString());
    core.setOutput('avg_time_to_merge', metrics.avgTimeToMerge.toFixed(2));
    core.setOutput('report_file', outputFile);
    
    // Create summary
    core.summary
      .addHeading('📊 PR Metrics Summary')
      .addTable([
        [{data: 'Metric', header: true}, {data: 'Value', header: true}],
        ['Total PRs', metrics.totalPRs.toString()],
        ['Merged PRs', metrics.mergedPRs.toString()],
        ['Open PRs', metrics.openPRs.toString()],
        ['Closed (Not Merged)', metrics.closedNotMerged.toString()],
        ['Avg Time to Merge', `${metrics.avgTimeToMerge.toFixed(1)} hours`],
        ['Merge Rate', `${metrics.mergeRate.toFixed(1)}%`]
      ])
      .write();
    
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}\n${error.stack}`);
  }
}

function calculateMetrics(prs, since) {
  const now = new Date();
  
  const totalPRs = prs.length;
  const openPRs = prs.filter(pr => pr.state === 'open').length;
  const closedPRs = prs.filter(pr => pr.state === 'closed').length;
  const mergedPRs = prs.filter(pr => pr.merged_at).length;
  const closedNotMerged = closedPRs - mergedPRs;
  
  // Calculate time to merge for merged PRs
  const mergedPRsWithTime = prs
    .filter(pr => pr.merged_at)
    .map(pr => {
      const created = new Date(pr.created_at);
      const merged = new Date(pr.merged_at);
      const hours = (merged - created) / (1000 * 60 * 60);
      return { pr, hours };
    });
  
  const avgTimeToMerge = mergedPRsWithTime.length > 0
    ? mergedPRsWithTime.reduce((sum, item) => sum + item.hours, 0) / mergedPRsWithTime.length
    : 0;
  
  const medianTimeToMerge = mergedPRsWithTime.length > 0
    ? calculateMedian(mergedPRsWithTime.map(item => item.hours))
    : 0;
  
  // Calculate merge rate
  const mergeRate = totalPRs > 0 ? (mergedPRs / totalPRs) * 100 : 0;
  
  // Top contributors
  const contributorMap = new Map();
  prs.forEach(pr => {
    const author = pr.user.login;
    if (!contributorMap.has(author)) {
      contributorMap.set(author, { prs: 0, merged: 0 });
    }
    const stats = contributorMap.get(author);
    stats.prs++;
    if (pr.merged_at) stats.merged++;
  });
  
  const topContributors = Array.from(contributorMap.entries())
    .map(([author, stats]) => ({ author, ...stats }))
    .sort((a, b) => b.prs - a.prs)
    .slice(0, 10);
  
  // PRs by size (lines changed)
  const prsBySizeRanges = {
    xs: 0,  // 0-10
    s: 0,   // 11-100
    m: 0,   // 101-500
    l: 0,   // 501-1000
    xl: 0   // 1000+
  };
  
  prs.forEach(pr => {
    const changes = (pr.additions || 0) + (pr.deletions || 0);
    if (changes <= 10) prsBySizeRanges.xs++;
    else if (changes <= 100) prsBySizeRanges.s++;
    else if (changes <= 500) prsBySizeRanges.m++;
    else if (changes <= 1000) prsBySizeRanges.l++;
    else prsBySizeRanges.xl++;
  });
  
  // PRs by day of week
  const prsByDay = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  prs.forEach(pr => {
    const day = dayNames[new Date(pr.created_at).getDay()];
    prsByDay[day]++;
  });
  
  return {
    totalPRs,
    openPRs,
    closedPRs,
    mergedPRs,
    closedNotMerged,
    avgTimeToMerge,
    medianTimeToMerge,
    mergeRate,
    topContributors,
    prsBySizeRanges,
    prsByDay,
    mergedPRsWithTime
  };
}

function calculateMedian(numbers) {
  if (numbers.length === 0) return 0;
  const sorted = numbers.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function generateReport(metrics, days, owner, repo, includeCharts) {
  const now = new Date();
  
  let report = `# 📊 PR Metrics Dashboard

**Repository:** ${owner}/${repo}  
**Period:** Last ${days} days  
**Generated:** ${now.toISOString().split('T')[0]}

---

## 📈 Overview

| Metric | Value |
|--------|-------|
| **Total PRs** | ${metrics.totalPRs} |
| **Merged PRs** | ${metrics.mergedPRs} ✅ |
| **Open PRs** | ${metrics.openPRs} 🔄 |
| **Closed (Not Merged)** | ${metrics.closedNotMerged} ❌ |
| **Merge Rate** | ${metrics.mergeRate.toFixed(1)}% |
| **Avg Time to Merge** | ${metrics.avgTimeToMerge.toFixed(1)} hours |
| **Median Time to Merge** | ${metrics.medianTimeToMerge.toFixed(1)} hours |

---

## 👥 Top Contributors

| Rank | Author | PRs | Merged | Merge Rate |
|------|--------|-----|--------|------------|
`;

  metrics.topContributors.forEach((contributor, index) => {
    const rate = contributor.prs > 0 ? (contributor.merged / contributor.prs * 100).toFixed(0) : 0;
    report += `| ${index + 1} | @${contributor.author} | ${contributor.prs} | ${contributor.merged} | ${rate}% |\n`;
  });

  report += `\n---

## 📏 PRs by Size

| Size | Count | Percentage |
|------|-------|------------|
| **XS** (0-10 lines) | ${metrics.prsBySizeRanges.xs} | ${(metrics.prsBySizeRanges.xs / metrics.totalPRs * 100).toFixed(1)}% |
| **S** (11-100 lines) | ${metrics.prsBySizeRanges.s} | ${(metrics.prsBySizeRanges.s / metrics.totalPRs * 100).toFixed(1)}% |
| **M** (101-500 lines) | ${metrics.prsBySizeRanges.m} | ${(metrics.prsBySizeRanges.m / metrics.totalPRs * 100).toFixed(1)}% |
| **L** (501-1000 lines) | ${metrics.prsBySizeRanges.l} | ${(metrics.prsBySizeRanges.l / metrics.totalPRs * 100).toFixed(1)}% |
| **XL** (1000+ lines) | ${metrics.prsBySizeRanges.xl} | ${(metrics.prsBySizeRanges.xl / metrics.totalPRs * 100).toFixed(1)}% |

---

## 📅 PRs by Day of Week

| Day | Count | Percentage |
|-----|-------|------------|
`;

  const dayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  dayOrder.forEach(day => {
    const count = metrics.prsByDay[day];
    const pct = (count / metrics.totalPRs * 100).toFixed(1);
    report += `| ${day} | ${count} | ${pct}% |\n`;
  });

  if (includeCharts) {
    report += `\n---

## 📊 Visual Charts

### Merge Rate
\`\`\`
Merged:     ${'█'.repeat(Math.round(metrics.mergeRate / 2))} ${metrics.mergeRate.toFixed(1)}%
Not Merged: ${'█'.repeat(Math.round((100 - metrics.mergeRate) / 2))} ${(100 - metrics.mergeRate).toFixed(1)}%
\`\`\`

### PR Size Distribution
\`\`\`
XS:  ${'█'.repeat(Math.round(metrics.prsBySizeRanges.xs / metrics.totalPRs * 50))} ${metrics.prsBySizeRanges.xs}
S:   ${'█'.repeat(Math.round(metrics.prsBySizeRanges.s / metrics.totalPRs * 50))} ${metrics.prsBySizeRanges.s}
M:   ${'█'.repeat(Math.round(metrics.prsBySizeRanges.m / metrics.totalPRs * 50))} ${metrics.prsBySizeRanges.m}
L:   ${'█'.repeat(Math.round(metrics.prsBySizeRanges.l / metrics.totalPRs * 50))} ${metrics.prsBySizeRanges.l}
XL:  ${'█'.repeat(Math.round(metrics.prsBySizeRanges.xl / metrics.totalPRs * 50))} ${metrics.prsBySizeRanges.xl}
\`\`\`

### Activity by Day
\`\`\`
Mon: ${'█'.repeat(Math.round(metrics.prsByDay.Mon / metrics.totalPRs * 50))} ${metrics.prsByDay.Mon}
Tue: ${'█'.repeat(Math.round(metrics.prsByDay.Tue / metrics.totalPRs * 50))} ${metrics.prsByDay.Tue}
Wed: ${'█'.repeat(Math.round(metrics.prsByDay.Wed / metrics.totalPRs * 50))} ${metrics.prsByDay.Wed}
Thu: ${'█'.repeat(Math.round(metrics.prsByDay.Thu / metrics.totalPRs * 50))} ${metrics.prsByDay.Thu}
Fri: ${'█'.repeat(Math.round(metrics.prsByDay.Fri / metrics.totalPRs * 50))} ${metrics.prsByDay.Fri}
Sat: ${'█'.repeat(Math.round(metrics.prsByDay.Sat / metrics.totalPRs * 50))} ${metrics.prsByDay.Sat}
Sun: ${'█'.repeat(Math.round(metrics.prsByDay.Sun / metrics.totalPRs * 50))} ${metrics.prsByDay.Sun}
\`\`\`
`;
  }

  report += `\n---

## 💡 Insights

`;

  // Generate insights
  if (metrics.avgTimeToMerge < 24) {
    report += `- ✅ **Fast merge times!** Average time to merge is under 24 hours.\n`;
  } else if (metrics.avgTimeToMerge > 72) {
    report += `- ⚠️ **Slow merge times.** Consider reviewing PR review processes.\n`;
  }

  if (metrics.mergeRate > 80) {
    report += `- ✅ **High merge rate!** ${metrics.mergeRate.toFixed(0)}% of PRs are being merged.\n`;
  } else if (metrics.mergeRate < 50) {
    report += `- ⚠️ **Low merge rate.** Many PRs are being closed without merging.\n`;
  }

  const smallPRs = metrics.prsBySizeRanges.xs + metrics.prsBySizeRanges.s;
  const smallPRPct = (smallPRs / metrics.totalPRs * 100);
  if (smallPRPct > 60) {
    report += `- ✅ **Good PR sizes!** ${smallPRPct.toFixed(0)}% of PRs are small (< 100 lines).\n`;
  } else if (smallPRPct < 30) {
    report += `- ⚠️ **Large PRs.** Consider breaking down PRs into smaller chunks.\n`;
  }

  const weekendPRs = metrics.prsByDay.Sat + metrics.prsByDay.Sun;
  const weekendPct = (weekendPRs / metrics.totalPRs * 100);
  if (weekendPct > 20) {
    report += `- 📅 **Weekend activity:** ${weekendPct.toFixed(0)}% of PRs created on weekends.\n`;
  }

  report += `\n---

*Generated by [PR Metrics Dashboard](https://github.com/rkneela0912/pr-metrics-dashboard)*
`;

  return report;
}

run();

