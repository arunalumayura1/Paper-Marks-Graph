```javascript
"use strict";

/* =========================================================
   GRADEFLOW
   Home Dashboard Controller
   Version 1.0
   ========================================================= */


/* ==================== 1. CONFIGURATION ==================== */

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
            progressLabelId: "etProgressLabel"
        },

        sft: {
            name: "Science for Technology",
            latestMarkId: "sftLatestMark",
            paperCountId: "sftPaperCount",
            progressLabelId: "sftProgressLabel"
        },

        ict: {
            name: "Information & Communication Technology",
            latestMarkId: "ictLatestMark",
            paperCountId: "ictPaperCount",
            progressLabelId: "ictProgressLabel"
        }
    };


    /* ==================== 2. SAFE DOM HELPERS ==================== */

    function getElement(id) {
        return document.getElementById(id);
    }

    function setText(id, value) {
        const element = getElement(id);

        if (element) {
            element.textContent = value;
        }
    }


    /* ==================== 3. STORAGE ==================== */

    /*
       Expected stored format:

       [
           {
               "id": "unique-paper-id",
               "mark": 75,
               "date": "2026-10-25T10:30:00.000Z",
               "name": "Paper 1"
           }
       ]

       Each subject has its own storage key.
    */

    function readSubjectMarks(subject) {
        const key = STORAGE_KEYS[subject];

        if (!key) {
            return [];
        }

        try {
            const rawData = localStorage.getItem(key);

            if (!rawData) {
                return [];
            }

            const parsedData = JSON.parse(rawData);

            if (!Array.isArray(parsedData)) {
                return [];
            }

            return parsedData.filter(item => {
                return (
                    item &&
                    typeof item === "object" &&
                    Number.isFinite(Number(item.mark)) &&
                    Number(item.mark) >= 0 &&
                    Number(item.mark) <= 100
                );
            });

        } catch (error) {
            console.error(
                `GradeFlow: Unable to read ${subject} marks.`,
                error
            );

            return [];
        }
    }


    /* ==================== 4. SUBJECT STATISTICS ==================== */

    function getSubjectStatistics(subject) {
        const marks = readSubjectMarks(subject);

        const totalPapers = marks.length;

        const latestPaper = totalPapers > 0
            ? marks[totalPapers - 1]
            : null;

        const latestMark = latestPaper
            ? Number(latestPaper.mark)
            : null;

        const totalMarks = marks.reduce((sum, paper) => {
            return sum + Number(paper.mark);
        }, 0);

        const average = totalPapers > 0
            ? totalMarks / totalPapers
            : null;

        return {
            marks,
            totalPapers,
            latestMark,
            average
        };
    }


    /* ==================== 5. UPDATE SUBJECT CARDS ==================== */

    function updateSubjectCard(subject) {
        const config = SUBJECTS[subject];

        if (!config) {
            return;
        }

        const statistics = getSubjectStatistics(subject);

        const {
            totalPapers,
            latestMark,
            average
        } = statistics;

        setText(
            config.latestMarkId,
            latestMark === null
                ? "--"
                : formatNumber(latestMark)
        );

        setText(
            config.paperCountId,
            String(totalPapers)
        );

        if (totalPapers === 0) {
            setText(
                config.progressLabelId,
                "No papers recorded yet"
            );

            return;
        }

        setText(
            config.progressLabelId,
            `Average ${formatNumber(average)}% across ${totalPapers} ${
                totalPapers === 1 ? "paper" : "papers"
            }`
        );
    }


    /* ==================== 6. UPDATE DASHBOARD TOTALS ==================== */

    function updateOverallStatistics() {
        let totalPapers = 0;
        let totalMarks = 0;
        let subjectsTracked = 0;

        Object.keys(SUBJECTS).forEach(subject => {
            const statistics = getSubjectStatistics(subject);

            totalPapers += statistics.totalPapers;

            totalMarks += statistics.marks.reduce((sum, paper) => {
                return sum + Number(paper.mark);
            }, 0);

            if (statistics.totalPapers > 0) {
                subjectsTracked++;
            }
        });

        /*
           Overall average is calculated using all recorded papers.

           Example:
           ET: 80, 70
           SFT: 90
           ICT: 60

           Overall average = (80 + 70 + 90 + 60) / 4
        */

        const overallAverage = totalPapers > 0
            ? totalMarks / totalPapers
            : null;

        setText("totalPapers", String(totalPapers));

        setText(
            "overallAverage",
            overallAverage === null
                ? "--"
                : formatNumber(overallAverage)
        );

        setText("subjectsTracked", String(subjectsTracked));

        updateDashboardMessage(
            totalPapers,
            subjectsTracked,
            overallAverage
        );
    }


    /* ==================== 7. DASHBOARD MESSAGE ==================== */

    function updateDashboardMessage(
        totalPapers,
        subjectsTracked,
        overallAverage
    ) {
        const messageElement = getElement("dashboardMessage");

        if (!messageElement) {
            return;
        }

        let message;

        if (totalPapers === 0) {
            message =
                "Your journey starts with the first paper. " +
                "Add your marks to begin tracking your progress.";

        } else if (subjectsTracked < 3) {
            message =
                `You have recorded ${totalPapers} ${
                    totalPapers === 1 ? "paper" : "papers"
                }. Add marks for your remaining subjects to build ` +
                "a complete academic overview.";

        } else if (overallAverage >= 75) {
            message =
                "Excellent work! Keep building on your progress " +
                "and aim for your next milestone.";

        } else if (overallAverage >= 50) {
            message =
                "You are building your progress. Review your papers, " +
                "identify weak areas, and keep improving.";

        } else {
            message =
                "Every paper is a new opportunity. Review your results, " +
                "focus on difficult topics, and keep moving forward.";
        }

        messageElement.textContent = message;
    }


    /* ==================== 8. NUMBER FORMATTING ==================== */

    function formatNumber(value) {
        if (!Number.isFinite(Number(value))) {
            return "--";
        }

        return Number(value).toLocaleString("en-US", {
            maximumFractionDigits: 2
        });
    }


    /* ==================== 9. REFRESH DASHBOARD ==================== */

    function refreshDashboard() {
        Object.keys(SUBJECTS).forEach(subject => {
            updateSubjectCard(subject);
        });

        updateOverallStatistics();
    }


    /* ==================== 10. STORAGE CHANGE DETECTION ==================== */

    /*
       When marks are changed in another tab on the same origin,
       the browser sends a storage event to this page.

       The dashboard refreshes automatically.
    */

    function handleStorageChange(event) {
        if (
            event.key === null ||
            Object.values(STORAGE_KEYS).includes(event.key)
        ) {
            refreshDashboard();
        }
    }


    /* ==================== 11. PAGE VISIBILITY ==================== */

    /*
       Refresh when the user returns to the dashboard tab.
    */

    function handleVisibilityChange() {
        if (document.visibilityState === "visible") {
            refreshDashboard();
        }
    }


    /* ==================== 12. INITIALIZATION ==================== */

    function init() {
        refreshDashboard();

        window.addEventListener(
            "storage",
            handleStorageChange
        );

        document.addEventListener(
            "visibilitychange",
            handleVisibilityChange
        );

        /*
           Useful when the browser restores a previously
           opened dashboard from its back-forward cache.
        */

        window.addEventListener("pageshow", refreshDashboard);
    }


    /* ==================== 13. PUBLIC API ==================== */

    return {
        init,
        refreshDashboard,
        getSubjectStatistics,
        readSubjectMarks
    };

})();


/* ==================== 14. START APPLICATION ==================== */

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        GradeFlow.init();
    });
} else {
    GradeFlow.init();
}
```
