
"use strict";

/* =========================================================
   GRADEFLOW — HOME DASHBOARD + SUBJECT PROGRESS GRAPHS
   ========================================================= */

const GradeFlow = (() => {
    const STORAGE_KEYS = {
        et: "gradeflow_et_marks",
        sft: "gradeflow_sft_marks",
        ict: "gradeflow_ict_marks"
    };

    const SUBJECTS = {
        et: {
            name: "Engineering Technology",
            latestMarkId: "etLatestMark",
            paperCountId: "etPaperCount",
            progressLabelId: "etProgressLabel",
            canvasId: "dashboardEtChart",
            emptyId: "dashboardEtEmpty",
            color: "#60a5fa"
        },
        sft: {
            name: "Science for Technology",
            latestMarkId: "sftLatestMark",
            paperCountId: "sftPaperCount",
            progressLabelId: "sftProgressLabel",
            canvasId: "dashboardSftChart",
            emptyId: "dashboardSftEmpty",
            color: "#34d399"
        },
        ict: {
            name: "Information & Communication Technology",
            latestMarkId: "ictLatestMark",
            paperCountId: "ictPaperCount",
            progressLabelId: "ictProgressLabel",
            canvasId: "dashboardIctChart",
            emptyId: "dashboardIctEmpty",
            color: "#c084fc"
        }
    };

    const charts = {};

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = getElement(id);
        if (element) element.textContent = value;
    }

    function formatNumber(value) {
        if (!Number.isFinite(Number(value))) return "--";

        return Number(value).toLocaleString("en-US", {
            maximumFractionDigits: 2
        });
    }

    /* Read records saved by each subject page */
    function readSubjectMarks(subject) {
        const key = STORAGE_KEYS[subject];
        if (!key) return [];

        try {
            const raw = localStorage.getItem(key);
            if (!raw) return [];

            const records = JSON.parse(raw);
            if (!Array.isArray(records)) return [];

            return records.filter(item =>
                item &&
                typeof item === "object" &&
                item.mark !== "" &&
                item.mark !== null &&
                item.mark !== undefined &&
                Number.isFinite(Number(item.mark)) &&
                Number(item.mark) >= 0 &&
                Number(item.mark) <= 100
            );
        } catch (error) {
            console.error(`GradeFlow: Could not read ${subject} marks.`, error);
            return [];
        }
    }

    function getSubjectStatistics(subject) {
        const marks = readSubjectMarks(subject);
        const totalPapers = marks.length;
        const latestPaper = totalPapers ? marks[totalPapers - 1] : null;

        const totalMarks = marks.reduce(
            (sum, paper) => sum + Number(paper.mark),
            0
        );

        return {
            marks,
            totalPapers,
            latestMark: latestPaper ? Number(latestPaper.mark) : null,
            average: totalPapers ? totalMarks / totalPapers : null
        };
    }

    /* Update the ET / SFT / ICT summary cards */
    function updateSubjectCard(subject) {
        const config = SUBJECTS[subject];
        const stats = getSubjectStatistics(subject);

        if (!config) return;

        setText(
            config.latestMarkId,
            stats.latestMark === null ? "--" : formatNumber(stats.latestMark)
        );

        setText(config.paperCountId, String(stats.totalPapers));

        if (!stats.totalPapers) {
            setText(config.progressLabelId, "No papers recorded yet");
        } else {
            setText(
                config.progressLabelId,
                `Average ${formatNumber(stats.average)}% across ` +
                `${stats.totalPapers} ${stats.totalPapers === 1 ? "paper" : "papers"}`
            );
        }
    }

    /* Build a chart only once for each subject */
    function createSubjectChart(subject) {
        const config = SUBJECTS[subject];
        const canvas = getElement(config.canvasId);

        if (!canvas || typeof Chart === "undefined") return null;
        if (charts[subject]) return charts[subject];

        const context = canvas.getContext("2d");

        charts[subject] = new Chart(context, {
            type: "line",
            data: {
                labels: [],
                datasets: [{
                    label: `${config.name} marks`,
                    data: [],
                    borderColor: config.color,
                    backgroundColor: `${config.color}22`,
                    borderWidth: 2.5,
                    fill: true,
                    tension: 0.3,
                    spanGaps: false,

                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: "#111827",
                    pointBorderColor: config.color,
                    pointBorderWidth: 2,

                    /* Green = increase, red = decrease, yellow = unchanged */
                    segment: {
                        borderColor: segmentContext => {
                            const previous = segmentContext.p0.parsed.y;
                            const current = segmentContext.p1.parsed.y;

                            if (current > previous) return "#22c55e";
                            if (current < previous) return "#ef4444";
                            return "#facc15";
                        }
                    }
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                animation: {
                    duration: 250
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
                        callbacks: {
                            label: context => ` Mark: ${context.parsed.y}/100`
                        }
                    }
                },
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            color: "#94a3b8",
                            maxRotation: 35,
                            minRotation: 0,
                            autoSkip: true,
                            maxTicksLimit: 7
                        },
                        border: {
                            color: "rgba(148, 163, 184, 0.15)"
                        }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            color: "#94a3b8"
                        },
                        grid: {
                            color: "rgba(148, 163, 184, 0.10)"
                        },
                        border: {
                            display: false
                        }
                    }
                }
            }
        });

        return charts[subject];
    }

    /* Refresh one dashboard graph from its localStorage records */
    function updateSubjectChart(subject) {
        const config = SUBJECTS[subject];
        if (!config) return;

        const records = readSubjectMarks(subject);
        const emptyMessage = getElement(config.emptyId);
        const chart = createSubjectChart(subject);

        if (emptyMessage) {
            emptyMessage.classList.toggle("is-hidden", records.length > 0);
        }

        if (!chart) return;

        chart.data.labels = records.map((paper, index) => {
            const name = typeof paper.name === "string" ? paper.name.trim() : "";
            return name || `Paper ${index + 1}`;
        });

        chart.data.datasets[0].data = records.map(paper => Number(paper.mark));
        chart.update();
    }

    /* Dashboard totals: average of every recorded paper */
    function updateOverallStatistics() {
        let totalPapers = 0;
        let totalMarks = 0;
        let subjectsTracked = 0;

        Object.keys(SUBJECTS).forEach(subject => {
            const stats = getSubjectStatistics(subject);

            totalPapers += stats.totalPapers;
            totalMarks += stats.marks.reduce(
                (sum, paper) => sum + Number(paper.mark),
                0
            );

            if (stats.totalPapers > 0) subjectsTracked++;
        });

        const average = totalPapers ? totalMarks / totalPapers : null;

        setText("totalPapers", String(totalPapers));
        setText("overallAverage", average === null ? "--" : formatNumber(average));
        setText("subjectsTracked", String(subjectsTracked));

        updateDashboardMessage(totalPapers, subjectsTracked, average);
    }

    function updateDashboardMessage(totalPapers, subjectsTracked, average) {
        const element = getElement("dashboardMessage");
        if (!element) return;

        let message;

        if (totalPapers === 0) {
            message =
                "Your journey starts with the first paper. " +
                "Add your marks to begin tracking your progress.";
        } else if (subjectsTracked < 3) {
            message =
                `You have recorded ${totalPapers} ` +
                `${totalPapers === 1 ? "paper" : "papers"}. Add marks for your ` +
                "remaining subjects to build a complete academic overview.";
        } else if (average >= 75) {
            message =
                "Excellent work! Keep building on your progress " +
                "and aim for your next milestone.";
        } else if (average >= 50) {
            message =
                "You are building your progress. Review your papers, " +
                "identify weak areas, and keep improving.";
        } else {
            message =
                "Every paper is a new opportunity. Review your results, " +
                "focus on difficult topics, and keep moving forward.";
        }

        element.textContent = message;
    }

    /* Refresh all cards, statistics and graphs */
    function refreshDashboard() {
        Object.keys(SUBJECTS).forEach(subject => {
            updateSubjectCard(subject);
            updateSubjectChart(subject);
        });

        updateOverallStatistics();
    }

    function handleStorageChange(event) {
        if (
            event.key === null ||
            Object.values(STORAGE_KEYS).includes(event.key)
        ) {
            refreshDashboard();
        }
    }

    function init() {
        refreshDashboard();

        /* Detect changes made in another browser tab */
        window.addEventListener("storage", handleStorageChange);

        /* Refresh when returning from a subject page */
        document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
                refreshDashboard();
            }
        });

        window.addEventListener("pageshow", refreshDashboard);

        /* Also refresh when the user returns using browser history */
        window.addEventListener("focus", refreshDashboard);
    }

    return {
        init,
        refreshDashboard,
        getSubjectStatistics,
        readSubjectMarks
    };
})();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", GradeFlow.init);
} else {
    GradeFlow.init();
}
