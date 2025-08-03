import { Detection, InferenceResults } from "../models/inference_models";
import { ClassCounts, InspectionResult, CheckPairs } from "../models/inspectionresults_models";


export function checkLeftRightOrder(infjson: InferenceResults, pair: [string, string]): string {
    try {
        const pair0 = infjson.detections.find(d => d.class_name === pair[0]);
        const pair1 = infjson.detections.find(d => d.class_name === pair[1]);
        if (pair0 && pair1) {
            if (pair0.xyxyn[0] < pair1.xyxyn[0]) {
                return "pass";
            } else {
                return "fail";
            }
        }
    } catch (error) {
        return "not checked";
    }
    return "not checked";
}

export function returnFailList(infjson: InferenceResults, checkPairs: [string, string][]): string[] {
    let overallChecksFail: string[] = [];
    for (const pair of checkPairs) {
        if (checkLeftRightOrder(infjson, pair) === "fail") {
            overallChecksFail = overallChecksFail.concat(pair);
        }
    }
    overallChecksFail = Array.from(new Set(overallChecksFail));
    return overallChecksFail;
}


export async function computeUpdateInspectionResultsView(targetView: InferenceResults, resultsView: InferenceResults, checkConditionEquals: boolean = false): Promise<InspectionResult> {
    let targetCounts = countclasses(targetView);
    let resultCounts = countclasses(resultsView);
    let inspectionResult = computeResults(targetCounts, resultCounts, checkConditionEquals);
    return inspectionResult;

}

export function countclasses(results: InferenceResults): ClassCounts {
    let class_counts: { [key: string]: number; } = {};
    for (let i = 0; i < results.detections.length; i++) {
        let class_name = results.detections[i].class_name;
        if (class_counts[class_name] === undefined) {
            class_counts[class_name] = 1;
        } else {
            class_counts[class_name] += 1;
        }
    }
    return class_counts;
}


export function computeResults(targetCounts: ClassCounts, actualCounts: ClassCounts, checkConditionEquals: boolean): InspectionResult {

    let isOK = true;
    const findings: string[] = [];

    const missing: string[] = [];
    const quantityMismatch: string[] = [];

    // Check for missing or different properties in actual
    for (const key in targetCounts) {
        if (!(key in actualCounts)) {
            missing.push(key);
            isOK = false;
        } else if (checkConditionEquals) {
            console.log(`Checking equality for ${key}: target=${targetCounts[key]}, actual=${actualCounts[key]}`);
            if (targetCounts[key] !== actualCounts[key]) {
                quantityMismatch.push(key);
                isOK = false;
            }
        } else {
            if (targetCounts[key] > actualCounts[key]) {
                quantityMismatch.push(key);
                isOK = false;
            }
        }
    }

    if (missing.length > 0) {
        findings.push(`Missing: ${missing.join(", ")}`);
    }

    if (quantityMismatch.length > 0) {
        findings.push(`Quantity Mismatch: ${quantityMismatch.join(", ")}`);
    }

    let result: InspectionResult = {
        overallResult: isOK ? "OK" : "NOT OK",
        inspectionFindings: findings
    };
    return result;
}
export function generateOrderFailureList(targetOrder: any, inferenceResult: InferenceResults) {
    let orderFailList: string[] = [];
    // Make targetOrder as models CheckPairs
    let checks = targetOrder as CheckPairs;
    let checkPairs = checks["leftright"];
    orderFailList = returnFailList(inferenceResult, checkPairs);
    return orderFailList;
}
export function parseInferenceMarkUp(inference: InferenceResults): string[] {
    const issues: string[] = [];
    inference.detections.forEach(detection => {
        issues.push(detection.class_name);
    });
    return issues;
}
export function parseIssuesForMarkUp(inspectionResult: InspectionResult): string[] {
    const issues: string[] = [];
    inspectionResult.inspectionFindings.forEach(finding => {
        const parts = finding.split(': ')[1];
        if (parts) {
            issues.push(...parts.split(', '));
        }
    });
    return issues;
}
export function createCountsStrings(counts: ClassCounts): string {
    let countString = "";
    for (let className in counts) {
        if (counts[className] > 0) {
            countString += `${className}: ${counts[className]}\n`;
        }
    }
    return countString;
}

