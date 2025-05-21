export var counters = new Map();
const COVERAGE_ON = true;
export function C(label) { 
    if (COVERAGE_ON) {
        if (counters.has(label)) {
            counters.set(label, counters.get(label)+1);
        } else {
            counters.set(label, 1);
        }
    }
}

// print out the coverage data and reset the counters
export function showCoverage() {
    const labels = Array.from(counters.keys()).sort();

    let curClass = "",
        curFunc="",
        lastPoint=-1;

    for (let label of labels) {
        console.log(label, counters.get(label));
        // labels look like class.func.pointNumber
        let [cl, func, point] = label.split('.');
        if ((cl == curClass) && (func == curFunc)) {
            // we should see continuity in the points reached.
            // Print out any p st lastPoint < p < point
            for (let p=parseInt(lastPoint)+1; p < point; p++) {
                console.log("skipped ", cl, ".", func, ".", p);
            }
            lastPoint = point;
        } else {
            curClass = cl;
            curFunc = func;
            lastPoint = point;
        }
    }
    counters = new Map();
}
