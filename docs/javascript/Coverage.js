////
// Use:  in any methods, add calls to COV(p, label) with an integer "point" p which indicates
// a place in the code.  'label' should be something like class.method or file.method
// Coverage will keep track of the number of times that place in the
// code is reached, using a counter named class.method.p
//
// At any time, called showCoverage() to print out the counters for each point reached.  
// If we see that a point has non-zero counts but an earlier point doesn't have any count,
// we show that the earlier point was skipped.

let counters = null; // keeps track of execution-counts at code points.

// by default, always leave COVERAGE_ON as false, or performance is terrible.  It should only 
// be turned on at runtime for testing, so that we don't accidentally ship with it enabled.

let COVERAGE_ON = false; // DO NOT CHANGE THIS VALUE HERE, EVEN TEMPORARILY.  

export function setCoverageOn() {
    COVERAGE_ON = true;
}

export function setCoverageOff() {
    COVERAGE_ON = false;
}

export function isCoverageOn() {
    return COVERAGE_ON;
}

export function getCounters() {
    if (counters === null) {
        counters = new Map();
    }
    return counters;
}

// Code coverage points are identified as class.method.point, where point is an integer.
export function COV(point, callerStr ) { 
    if (COVERAGE_ON) {
        // UGLY!
        let leader = (point < 10) ? "0" : "",
            key = `${callerStr}.${leader}${point}`;

        if (getCounters().has(key)) {
            getCounters().set(key, getCounters().get(key)+1);
        } else {
            getCounters().set(key, 1);
        }
    }
}

// print out the coverage data and reset the counters
export function showCoverage(appCounters, nonAppCounters) {
    console.log("appCounters:", appCounters, "nonAppCounters", nonAppCounters);
    if (COVERAGE_ON) {
        var combinedCounters = new Map([...appCounters]);

        for (let key of nonAppCounters.keys()) {
            if (combinedCounters.has(key)) {
                combinedCounters.set(key, combinedCounters.get(key) + nonAppCounters.get(key));
            } else {
                combinedCounters.set(key, nonAppCounters.get(key));
            }
        }

        const labels = Array.from(combinedCounters.keys()).sort();

        if (labels.length === 0) {
            console.log("No coverage recorded. Make sure COVERAGE_ON is true in Coverage.js, and run some tests!");
            return;
        }

        let curClass = "",
            curFunc = "",
            lastPoint = -1,
            skippedLabels = [];

        for (let label of labels) {
            // labels look like class.func.pointNumber
            let [cl, func, pointStr] = label.split('.');
            let point=parseInt(pointStr);

            if (point === 0) {
                console.log(`${cl}.${func}()`);
            } 
            console.log(`  @ ${point}:  ${combinedCounters.get(label)}`);
            if ((cl == curClass) && (func == curFunc)) {
                // we should see continuity in the points reached.
                // Print out any p st lastPoint < p < point
                for (let p=lastPoint+1; p < point; p++) {
                    skippedLabels.push(`${cl}.${func} @ ${p}`);
                }
                lastPoint = point;
            } else {
                curClass = cl;
                curFunc = func;
                lastPoint = point;
            }
        }

        console.log("Skipped coverage points:");
        if (skippedLabels.length === 0) {
            console.log("None!");
        } else {
            console.log(skippedLabels.join("\n"));
        }
    }
}

export function clearCoverage() {
    counters = new Map();
}
