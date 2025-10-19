# PR Metrics Dashboard 📊

[![GitHub release](https://img.shields.io/github/v/release/rkneela0912/pr-metrics-dashboard)](https://github.com/rkneela0912/pr-metrics-dashboard/releases) [![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

Generate comprehensive PR activity metrics, charts, and insights for your repository. Track team performance, identify bottlenecks, and improve your development workflow with data-driven insights.

## ✨ Features

- **📈 Comprehensive Metrics:** Total PRs, merge rates, time to merge, and more
- **👥 Top Contributors:** Track who's contributing and their merge rates
- **📏 PR Size Analysis:** Distribution of PR sizes (XS, S, M, L, XL)
- **📅 Activity Patterns:** See which days are most active
- **📊 ASCII Charts:** Visual representations right in markdown
- **💡 Automated Insights:** Get actionable recommendations
- **⏱️ Time Tracking:** Average and median time to merge

## 🚀 Quick Start

Create `.github/workflows/pr-metrics.yml`:

```yaml
name: PR Metrics Dashboard

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
      
      - name: Generate metrics
        uses: rkneela0912/pr-metrics-dashboard@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          days: 30
      
      - name: Commit report
        run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add PR_METRICS.md
          git commit -m "docs: update PR metrics" || exit 0
          git push
```

## 📊 Example Output

The action generates a comprehensive markdown report with:

- Overview metrics (total PRs, merge rate, avg time to merge)
- Top contributors ranking
- PR size distribution
- Activity by day of week
- ASCII charts for visualization
- Automated insights and recommendations

## ⚙️ Configuration

### Inputs

| Input | Description | Default | Required |
|-------|-------------|---------|----------|
| `github_token` | GitHub token for API access | - | ✅ Yes |
| `days` | Number of days to analyze | `30` | No |
| `output_file` | Output file path | `PR_METRICS.md` | No |
| `include_charts` | Include ASCII charts | `true` | No |

### Outputs

| Output | Description |
|--------|-------------|
| `total_prs` | Total number of PRs |
| `merged_prs` | Number of merged PRs |
| `avg_time_to_merge` | Average time to merge (hours) |
| `report_file` | Generated report file path |

## 📋 Usage Examples

### Weekly Report

```yaml
on:
  schedule:
    - cron: '0 0 * * 0'  # Every Sunday

jobs:
  metrics:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: read
    steps:
      - uses: actions/checkout@v4
      - uses: rkneela0912/pr-metrics-dashboard@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          days: 7
```

### Monthly Report with Custom Location

```yaml
- uses: rkneela0912/pr-metrics-dashboard@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    days: 30
    output_file: 'docs/metrics/monthly-report.md'
```

### Quarterly Report

```yaml
- uses: rkneela0912/pr-metrics-dashboard@v1
  with:
    github_token: ${{ secrets.GITHUB_TOKEN }}
    days: 90
    output_file: 'reports/Q1-2025.md'
```

## 🎯 What You Get

### Metrics Tracked

- Total PRs (open, merged, closed)
- Merge rate percentage
- Average time to merge
- Median time to merge
- Top 10 contributors
- PR size distribution (XS/S/M/L/XL)
- Activity by day of week

### Automated Insights

The dashboard provides intelligent insights such as:
- ✅ Fast merge times detected
- ⚠️ Slow review cycles identified
- ✅ High merge rate achievements
- ⚠️ Large PR warnings
- 📅 Weekend activity patterns

## 🔧 Deployment Steps

1. **Create workflow file** in `.github/workflows/`
2. **Configure schedule** (weekly, monthly, etc.)
3. **Set permissions** (contents: write, pull-requests: read)
4. **Add commit step** to save the report
5. **Test manually** using "Run workflow" button

## 📈 Best Practices

- Run weekly for regular tracking
- Commit reports to track trends over time
- Share reports with the team
- Use insights to improve processes
- Adjust `days` parameter based on your sprint length

## 🐛 Troubleshooting

**No PRs found?**
- Check the `days` parameter covers a period with PR activity

**Report not committed?**
- Ensure `contents: write` permission is set
- Check git config is set correctly in commit step

## 📚 Permissions

```yaml
permissions:
  contents: write        # To commit the report
  pull-requests: read    # To read PR data
```

## 📖 Learn More

- [Complete Deployment Guide](https://github.com/rkneela0912/pr-metrics-dashboard#readme)
- [Example Reports](https://github.com/rkneela0912/pr-metrics-dashboard/tree/main/examples)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)

## 🤝 Contributing

Contributions welcome! Open an issue or submit a PR.

## 📄 License

[MIT License](LICENSE)

## ⭐ Support

Star this repo if you find it helpful!

For issues: [Open an issue](https://github.com/rkneela0912/pr-metrics-dashboard/issues)

---

**Made with ❤️ to help teams improve their development workflow**
