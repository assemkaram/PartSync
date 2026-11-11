# PartSync

PartSync is an AI-assisted PC builder. It helps you choose components for a custom computer, checks that the parts work together, confirms the power supply can handle the system, and balances performance against cost.

> **Status:** Early draft. Features and setup steps below describe the planned version 0.1 and will be updated as the project develops.

## Features

- **Guided builds:** Enter a budget and a use case (gaming, streaming, editing, workstation, or general) and get a complete parts list.
- **Plain-language explanations:** Every part comes with a short reason for why it was chosen.
- **Compatibility checks:** Flags mismatched CPU sockets, RAM types, and case or cooler clearance, and suggests compatible replacements.
- **Power balance:** Estimates total system draw and recommends a power supply with safety headroom.
- **Value comparison:** Compares alternative parts by price and expected performance.
- **Budget control:** Suggests cheaper options when a build is over budget, and upgrades when there is room to spare.
- **Saved builds:** Save, rename, duplicate, compare, and export your parts lists.

## Who It Is For

- **First-time builders** who want a working PC without learning the jargon.
- **Gamers and creators** who know their use case and budget and want the best performance per dollar.
- **Value shoppers** who want to avoid overpaying.

## Getting Started

> Setup instructions will be added once the tech stack is finalized.

```bash
# Clone the repository
git clone https://github.com/<your-username>/partsync.git
cd partsync

# Install dependencies (to be defined)
# Run the development server (to be defined)
```

## Usage

1. Open PartSync in your browser.
2. Enter your budget and choose a primary use case, or describe your goals in plain language.
3. Review the generated build, including the total cost, estimated power draw, and compatibility status.
4. Replace any part you want to change. The totals and checks update automatically.
5. Save the build or export the parts list.

## User Stories

**US-01: Plain-language start.** As a first-time builder, I want to describe my goals in plain language so that I do not need to know component names.
- The system converts a free-text description into a budget and use case. If either is unclear, it asks one clarifying question.

**US-02: Budget and use case.** As a gamer, I want to enter a budget and a use case so that the build matches what I need.
- Both fields are required. The generated build matches the use case and stays within budget.

**US-03: Brand preference.** As a builder, I want to set an Intel or AMD preference so that the build respects my platform choice.
- Every generated CPU and motherboard matches the selected brand.

**US-04: Part reasons.** As a builder, I want to see why each part was chosen so that I learn while I build.
- Each component has a one-sentence reason visible on the page.

**US-05: Part replacement.** As a builder, I want to replace any part so that I can customize the build.
- Totals, power estimate, and compatibility status update in the same view.

**US-06: Compatibility warnings.** As a builder, I want incompatible parts flagged so that I do not buy something that will not work.
- Mismatched sockets are marked incompatible, both parts are named, and at least one compatible replacement is offered.

**US-07: Power sufficiency.** As a builder, I want to know the power supply is sufficient so that the PC does not crash under load.
- The summary shows estimated draw and PSU wattage. If the PSU is below draw plus 20 percent headroom, the build is flagged and a larger PSU is suggested with its added cost.

**US-08: Value comparison.** As a value shopper, I want to compare alternatives so that I get more performance for my money.
- For any part, at least two alternatives are shown side by side with price and value score.

**US-09: Over-budget options.** As a budget-limited builder, I want a cheaper version when my build is over budget so that I can stay within my limit.
- A lower-cost build within budget is proposed, with the performance trade-off stated.

**US-10: Upgrade suggestions.** As a builder with spare budget, I want upgrade suggestions so that I can improve the build.
- At least one upgrade is suggested with its cost difference and performance effect.

**US-11: Pre-purchase summary.** As a builder, I want a summary before buying so that I can review the whole build.
- One screen shows total cost, estimated wattage, budget status, and overall compatibility.

**US-12: Save and manage builds.** As a builder, I want to save and manage my builds so that I can return to them and compare options.
- Saved builds can be opened, renamed, duplicated, and deleted. The list shows name, date, and total cost.

**US-13: Build comparison.** As a builder, I want to compare two saved builds so that I can choose the better value.
- Cost, power, and expected performance differences are shown for the two builds.

**US-14: Export.** As a builder, I want to export my parts list so that I can order the parts or share it.
- The list can be downloaded or copied, and includes part names, prices, and the build total.

**US-15: Clear error messages.** As a user, I want clear messages when something is missing or wrong so that I know how to fix it.
- An empty or invalid budget shows a specific message next to the field. A failed AI request shows a retry option without losing saved builds.

The full set of requirements and scenarios is in [docs/requirements.md](docs/requirements.md).

## Requirements Overview

The full requirements are in [docs/requirements.md](docs/requirements.md). In brief:

- Inputs: budget (currency) and primary use case; optional CPU brand preference (Intel or AMD).
- Outputs: a complete build (CPU, GPU, motherboard, RAM, storage, PSU, case) within budget or with a clear note on the overage.
- Checks: CPU and motherboard socket match, RAM generation, GPU and cooler fit, and PSU headroom of at least 20 percent over estimated draw.
- Non-functional goals: fast generation, clearly labeled estimates, WCAG 2.1 AA accessibility, responsive layout, and no account required for basic use.

## Scope

**Included in this version:** guided build generation, manual part selection, compatibility checking, power balance estimation, value comparison, build saving, and export.

**Not included:** placing orders or payments, live retailer price tracking, and troubleshooting built machines.

## Assumptions

- Parts, prices, and performance data come from a catalog maintained by the project.
- The AI selects parts only from that catalog.
- Power and performance figures are estimates and are labeled as such.

## Roadmap

- [ ] Finalize the parts catalog and data sources
- [ ] Build the guided build generator
- [ ] Implement compatibility and power checks
- [ ] Add value comparison and budget suggestions
- [ ] Add build saving, comparison, and export
- [ ] Accessibility and responsive design review

## Team

1. Assem Karam Kamel
2. Omar Mohamad Adly Mohamad
3. Omar Mohamed Ahmed Ibrahim Omar
4. Abdelmaged Ahmed Abdelmaged Hekal
5. Ahmed Adel Fekry AbdelQader

## Contributing

Contributions are welcome. Please open an issue to discuss significant changes before submitting a pull request.

## License

To be determined.
