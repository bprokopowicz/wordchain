////
// Use:  in any methods, add calls to COV(p) with an integer "point" p which indicates
// a place in the code.  Coverage will keep track of the number of times that place in the
// code is reached, using a counter named class.method.p
//
// At any time, called showCoverage() to print out the counters for each point reached.  
// If we see that a point has non-zero counts but an earlier point doesn't have any count,
// we show that the earlier point was skipped.

var counters = new Map(); // keeps track of execution-counts at code points.

const COVERAGE_ON = true;

export function COV(point) { 
    if (COVERAGE_ON) {
        const dummyObj = {};
        Error.captureStackTrace(dummyObj, COV); // don't include COV() or earlier calls in the stack

        const callStack = dummyObj.stack.split("at ");
        const callerStr = callStack[1]; // the first line is the word 'Error', then the caller function
        const callerTokens = callerStr.split(' ');
        var caller = callerTokens[0];
        if (caller === 'new') {
            // it's the CTOR, not class.method
            caller = callerTokens[1] + '.constructor';
        }

        const key = caller + '.' + point;
        if (counters.has(key)) {
            counters.set(key, counters.get(key)+1);
        } else {
            counters.set(key, 1);
        }
    }
}

// print out the coverage data and reset the counters
export function showCoverage() {
    console.log("Coverage counters");
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

