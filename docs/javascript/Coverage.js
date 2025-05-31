////
// Use:  in any methods, add calls to COV(p) with an integer "point" p which indicates
// a place in the code.  Coverage will keep track of the number of times that place in the
// code is reached, using a counter named class.method.p
//
// At any time, called showCoverage() to print out the counters for each point reached.  
// If we see that a point has non-zero counts but an earlier point doesn't have any count,
// we show that the earlier point was skipped.


// TODO - there is a bug in how statics and globals are managed.  It seems that for some reason,
// simple globals, as well as class statics, have two or more instances, maybe depending on the 
// class loader.  For tests that run using the scheduler, and show their results after the last
// scheduled test, the counters are empty.  But during the test, we see the counters incrementing.
// It seems like there are two counters maps.  

class Coverage { 
    static counters = null; // keeps track of execution-counts at code points.

    static COVERAGE_ON = true;

    static getCounters() {
        if (Coverage.counters === null) {
            Coverage.counters = new Map();
            const dummyObj = {};
            Error.captureStackTrace(dummyObj); 
            console.log("Created new counters map, called from:", dummyObj.stack);
        }
        return Coverage.counters;
    }

    static COV(point) { 
        if (Coverage.COVERAGE_ON) {
            const dummyObj = {};
            Error.captureStackTrace(dummyObj, Coverage.COV); // don't include COV() in the stack trace

            const callStack = dummyObj.stack.split("at ");
            const callerStr = callStack[1]; // the zeroth line is the word 'Error', then comes the caller 
            const callerTokens = callerStr.split(' ');
            var caller = callerTokens[0];
            if (caller === 'new') {
                // it's the CTOR, not class.method
                caller = callerTokens[1] + '.constructor';
            }

            const key = caller + '.' + point;
            const nPointsCovered = Coverage.getCounters().size;
            //console.log("reached", key, nPointsCovered);
            if (Coverage.getCounters().has(key)) {
                Coverage.getCounters().set(key, Coverage.getCounters().get(key)+1);
            } else {
                Coverage.getCounters().set(key, 1);
            }
        }
    }

    // print out the coverage data and reset the counters
    static showCoverage() {
        if (Coverage.COVERAGE_ON) {
            console.log("Coverage counters", Coverage.getCounters());
            const labels = Array.from(Coverage.getCounters().keys()).sort();

            let curClass = "",
                curFunc="",
                lastPoint=-1;

            for (let label of labels) {
                // labels look like class.func.pointNumber
                let [cl, func, pointStr] = label.split('.');
                let point=parseInt(pointStr);

                if (point === 0) {
                    console.log(`${cl}.${func}()`);
                } 
                console.log(`  @ ${point}:  ${Coverage.getCounters().get(label)}`);
                if ((cl == curClass) && (func == curFunc)) {
                    // we should see continuity in the points reached.
                    // Print out any p st lastPoint < p < point
                    for (let p=lastPoint+1; p < point; p++) {
                        console.log(`  *********  skipped ${cl}.${func} @ ${p}`);
                    }
                    lastPoint = point;
                } else {
                    curClass = cl;
                    curFunc = func;
                    lastPoint = point;
                }
            }
        }
    }

    static clearCoverage() {
        Coverage.counters = new Map();
    }
};

export const COV = Coverage.COV; 
export const showCoverage = Coverage.showCoverage; 
export const clearCoverage = Coverage.clearCoverage;
