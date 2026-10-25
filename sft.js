"use strict";

(() => {
    const STORAGE_KEY = "gradeflow_sft_marks";

    const elements = {
        form: document.getElementById("sftMarksForm"),
        paperName: document.getElementById("sftPaperName"),
        paperDate: document.getElementById("sftPaperDate"),
        paperMark: document.getElementById("sftPaperMark"),
        latestMark: document.getElementById("sftLatestMark"),
        averageMark: document.getElementById("sftAverageMark"),
        paperCount: document.getElementById("sftPaperCount"),
        bestMark: document.getElementById("sftBestMark"),
        chartCanvas: document.getElementById("sftChart"),
        chartMessage: document.getElementById("sftChartMessage"),
        clearButton: document.getElementById("sftClearGraph"),
        formMessage: document.getElementById("sftFormMessage"),
        historyBody: document.getElementById("sftHistoryBody"),
        historyCount: document.getElementById("sftHistoryCount")
    };

    let chart = null;
    let papers = [];

    const COLORS = {
        green: "#22c55e",
        red: "#f87171",
        yellow: "#facc15",
        purple: "#a78bfa",
        grid: "rgba(148, 163, 184, 0.10)",
        text: "#94a3b8"
    };

    function formatMark(value) {
        return Number(value).toLocaleString("en-US", {
            maximumFractionDigits: 2
        });
    }

    function getToday() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, "0");
        const day = String(now.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    }

    function createId() {
        if (window.crypto && typeof window.crypto.randomUUID === "function") {
            return window.crypto.randomUUID();
        }

        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }

    function showMessage(message, type = "info") {
        if (!elements.formMessage) return;

        const styles = {
            success: {
                color: "#86efac",
                background: "rgba(34, 197, 94, 0.08)",
                borderColor: "rgba(34, 197, 94, 0.25)"
            },
            error: {
                color: "#fca5a5",
                background: "rgba(248, 113, 113, 0.08)",
                borderColor: "rgba(248, 113, 113, 0.25)"
            },
            info: {
                color: "#cbd5e1",
                background: "rgba(148, 163, 184, 0.06)",
                borderColor: "rgba(148, 163, 184, 0.18)"
            }
        };

        elements.formMessage.textContent = message;
        elements.formMessage.style.display = message ? "block" : "none";

        Object.assign(
            elements.formMessage.style,
            styles[type] || styles.info
        );
    }

    function readSavedPapers() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (!saved) return [];

            const parsed = JSON.parse(saved);

            if (!Array.isArray(parsed)) return [];

            return parsed
                .filter((paper) =>
                    paper &&
                    typeof paper === "object" &&
                    Number.isFinite(Number(paper.mark)) &&
                    Number(paper.mark) >= 0 &&
                    Number(paper.mark) <= 100
                )
                .map((paper) => ({
                    id: String(paper.id || createId()),
                    name: String(paper.name || paper.title || "Untitled Paper"),
                    date: /^\d{4}-\d{2}-\d{2}$/.test(String(paper.date || ""))
                        ? String(paper.date)
                        : "",
                    mark: Number(paper.mark)
                }));
        } catch (error) {
            console.error("Unable to read SFT records:", error);
            showMessage(
                "Could not read your saved records. Check your browser storage settings.",
                "error"
            );
            return [];
        }
    }

    function savePapers() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(papers));
            return true;
        } catch (error) {
            console.error("Unable to save SFT records:", error);

            showMessage(
                "Your records could not be saved. Check browser storage settings or available space.",
                "error"
            );
            return false;
        }
    }

    function getChange(index) {
        if (index === 0) return null;

        return papers[index].mark - papers[index - 1].mark;
    }

    function getChangeColor(change) {
        if (change === null) return COLORS.purple;
        if (change > 0) return COLORS.green;
        if (change < 0) return COLORS.red;

        return COLORS.yellow;
    }

    function getChangeLabel(change) {
        if (change === null) return "First paper";
        if (change > 0) return `+${formatMark(change)}`;
        if (change < 0) return `−${formatMark(Math.abs(change))}`;

        return "0 · Same";
    }

    function updateStatistics() {
        const count = papers.length;

        if (elements.paperCount) {
            elements.paperCount.textContent = String(count);
        }

        if (count === 0) {
            if (elements.latestMark) elements.latestMark.textContent = "—";
            if (elements.averageMark) elements.averageMark.textContent = "—";
            if (elements.bestMark) elements.bestMark.textContent = "—";
            return;
        }

        const latest = papers[count - 1].mark;
        const total = papers.reduce((sum, paper) => sum + paper.mark, 0);
        const average = total / count;
        const best = Math.max(...papers.map((paper) => paper.mark));

        if (elements.latestMark) {
            elements.latestMark.textContent = formatMark(latest);
        }

        if (elements.averageMark) {
            elements.averageMark.textContent = formatMark(average);
        }

        if (elements.bestMark) {
            elements.bestMark.textContent = formatMark(best);
        }
    }

    function renderHistory() {
        if (!elements.historyBody) return;

        elements.historyBody.replaceChildren();

        if (elements.historyCount) {
            elements.historyCount.textContent =
                `${papers.length} ${papers.length === 1 ? "paper" : "papers"}`;
        }

        if (papers.length === 0) {
            const row = document.createElement("tr");
            const cell = document.createElement("td");

            cell.colSpan = 6;
            cell.className = "et-empty-history";
            cell.textContent =
                "No papers recorded yet. Add your first paper above!";

            row.appendChild(cell);
            elements.historyBody.appendChild(row);
            return;
        }

        papers.forEach((paper, index) => {
            const row = document.createElement("tr");
            const change = getChange(index);

            const numberCell = document.createElement("td");
            numberCell.textContent = String(index + 1);

            const nameCell = document.createElement("td");
            nameCell.textContent = paper.name;

            const dateCell = document.createElement("td");
            dateCell.textContent = paper.date || "—";

            const markCell = document.createElement("td");
            markCell.textContent = formatMark(paper.mark);
            markCell.style.fontWeight = "800";

            const changeCell = document.createElement("td");
            changeCell.textContent = getChangeLabel(change);
            changeCell.style.color = getChangeColor(change);
            changeCell.style.fontWeight = "750";

            const actionCell = document.createElement("td");
            const deleteButton = document.createElement("button");

            deleteButton.type = "button";
            deleteButton.textContent = "Delete";
            deleteButton.dataset.deleteId = paper.id;
            deleteButton.setAttribute(
                "aria-label",
                `Delete ${paper.name}`
            );

            actionCell.appendChild(deleteButton);

            row.append(
                numberCell,
                nameCell,
                dateCell,
                markCell,
                changeCell,
                actionCell
            );

            elements.historyBody.appendChild(row);
        });
    }

    function renderChart() {
        if (!elements.chartCanvas || typeof Chart === "undefined") {
            if (elements.chartMessage) {
                elements.chartMessage.textContent =
                    "The graph library could not load. Check your internet connection and reload the page.";
            }
            return;
        }

        if (chart) {
            chart.destroy();
            chart = null;
        }

        const labels = papers.map((paper, index) =>
            `${index + 1}. ${paper.name}`
        );

        const marks = papers.map((paper) => paper.mark);

        chart = new Chart(elements.chartCanvas, {
            type: "line",

            data: {
                labels,

                datasets: [{
                    label: "SFT Marks",
                    data: marks,
                    borderColor: COLORS.purple,
                    borderWidth: 3,

                    segment: {
                        borderColor: (context) => {
                            const previous = context.p0.parsed.y;
                            const current = context.p1.parsed.y;

                            if (current > previous) return COLORS.green;
                            if (current < previous) return COLORS.red;

                            return COLORS.yellow;
                        }
                    },

                    pointBackgroundColor: marks.map((mark, index) => {
                        if (index === 0) return COLORS.purple;

                        return getChangeColor(mark - marks[index - 1]);
                    }),

                    pointBorderColor: "#10182a",
                    pointBorderWidth: 2,
                    pointRadius: 5,
                    pointHoverRadius: 8,
                    tension: 0.25,
                    fill: false
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                animation: {
                    duration: 450
                },

                interaction: {
                    intersect: false,
                    mode: "index"
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor: "#10182a",
                        titleColor: "#f1f5f9",
                        bodyColor: "#cbd5e1",
                        borderColor: "rgba(167, 139, 250, 0.3)",
                        borderWidth: 1,
                        padding: 12,

                        callbacks: {
                            label: (context) =>
                                ` Mark: ${formatMark(context.parsed.y)} / 100`
                        }
                    }
                },

                scales: {
                    x: {
                        grid: {
                            display: false
                        },

                        ticks: {
                            color: COLORS.text,
                            maxRotation: 35,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 8,

                            font: {
                                size: 10
                            }
                        },

                        border: {
                            display: false
                        }
                    },

                    y: {
                        min: 0,
                        max: 100,

                        ticks: {
                            stepSize: 20,
                            color: COLORS.text,

                            font: {
                                size: 10
                            }
                        },

                        grid: {
                            color: COLORS.grid
                        },

                        border: {
                            display: false
                        }
                    }
                }
            }
        });

        if (elements.chartMessage) {
            if (papers.length === 0) {
                elements.chartMessage.textContent =
                    "Your progress will appear here after you add a paper.";
            } else if (papers.length === 1) {
                elements.chartMessage.textContent =
                    "First paper recorded! Add another paper to compare your progress.";
            } else {
                const change = getChange(papers.length - 1);

                if (change > 0) {
                    elements.chartMessage.textContent =
                        `Great progress! Your latest mark increased by ${formatMark(change)} marks.`;
                } else if (change < 0) {
                    elements.chartMessage.textContent =
                        `Your latest mark decreased by ${formatMark(Math.abs(change))} marks. Keep practising!`;
                } else {
                    elements.chartMessage.textContent =
                        "Your latest mark is unchanged from the previous paper.";
                }
            }
        }
    }

    function refreshPage() {
        updateStatistics();
        renderHistory();
        renderChart();
    }

    function handleAddPaper(event) {
        event.preventDefault();

        const name = elements.paperName.value.trim();
        const date = elements.paperDate.value;
        const markInput = elements.paperMark.value.trim();
        const mark = Number(markInput);

        if (!name) {
            showMessage("Please enter a paper name.", "error");
            elements.paperName.focus();
            return;
        }

        if (!date) {
            showMessage("Please select the paper date.", "error");
            elements.paperDate.focus();
            return;
        }

        if (
            markInput === "" ||
            !Number.isFinite(mark) ||
            mark < 0 ||
            mark > 100
        ) {
            showMessage("Enter a valid mark between 0 and 100.", "error");
            elements.paperMark.focus();
            return;
        }

        papers.push({
            id: createId(),
            name,
            date,
            mark
        });

        if (!savePapers()) {
            papers.pop();
            return;
        }

        refreshPage();
        elements.form.reset();
        elements.paperDate.value = getToday();

        showMessage(
            `${name} saved successfully! Your SFT graph has been updated.`,
            "success"
        );

        elements.paperName.focus();
    }

    function handleDeletePaper(event) {
        const button = event.target.closest("button[data-delete-id]");

        if (!button || !elements.historyBody.contains(button)) return;

        const id = button.dataset.deleteId;
        const paper = papers.find((item) => item.id === id);

        if (!paper) return;

        const confirmed = window.confirm(
            `Delete "${paper.name}" and update your SFT graph?`
        );

        if (!confirmed) return;

        const previousPapers = papers;
        papers = papers.filter((item) => item.id !== id);

        if (!savePapers()) {
            papers = previousPapers;
            return;
        }

        refreshPage();
        showMessage(`"${paper.name}" has been deleted.`, "success");
    }

    function handleClearGraph() {
        if (papers.length === 0) {
            showMessage("There are no SFT records to clear.", "info");
            return;
        }

        const confirmed = window.confirm(
            "Clear all Science for Technology papers and reset the SFT graph? This cannot be undone."
        );

        if (!confirmed) return;

        const previousPapers = papers;
        papers = [];

        if (!savePapers()) {
            papers = previousPapers;
            return;
        }

        refreshPage();
        showMessage(
            "All SFT records and the graph have been cleared.",
            "success"
        );
    }

    function init() {
        if (!elements.form || !elements.chartCanvas) {
            console.error("SFT page elements are missing. Check sft.html.");
            return;
        }

        papers = readSavedPapers();

        if (elements.paperDate) {
            elements.paperDate.value = getToday();
        }

        elements.form.addEventListener("submit", handleAddPaper);

        if (elements.clearButton) {
            elements.clearButton.addEventListener("click", handleClearGraph);
        }

        if (elements.historyBody) {
            elements.historyBody.addEventListener("click", handleDeletePaper);
        }

        window.addEventListener("storage", (event) => {
            if (event.key === STORAGE_KEY || event.key === null) {
                papers = readSavedPapers();
                refreshPage();
            }
        });

        refreshPage();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
