import Docxtemplater from "docxtemplater";
import PizZip from "pizzip";
import PizZipUtils from "pizzip/utils/index.js";
import { saveAs } from "file-saver";
import { format } from "date-fns";
import { db } from "./firebase";
import store from "./store";
import { updateState } from "./actions";

function loadFile(url, callback) {
    PizZipUtils.getBinaryContent(url, callback);
}

const generateDoc = (data) => {
    loadFile("https://ismail-creatvt.github.io/salaryslip/document/template.docx", function (
        error,
        content
    ) {
        if (error) {
            throw error;
        }
        var zip = new PizZip(content);
        var doc = new Docxtemplater().loadZip(zip);
        doc.setData(data);
        try {
            // render the document (replace all occurences of {first_name} by John, {last_name} by Doe, ...)
            doc.render();
        } catch (error) {
            // The error thrown here contains additional information when logged with JSON.stringify (it contains a properties object containing all suberrors).
            function replaceErrors(key, value) {
                if (value instanceof Error) {
                    return Object.getOwnPropertyNames(value).reduce(function (
                        error,
                        key
                    ) {
                        error[key] = value[key];
                        return error;
                    },
                        {});
                }
                return value;
            }
            console.log(JSON.stringify({ error: error }, replaceErrors));

            if (error.properties && error.properties.errors instanceof Array) {
                const errorMessages = error.properties.errors
                    .map(function (error) {
                        return error.properties.explanation;
                    })
                    .join("\n");
                console.log("errorMessages", errorMessages);
                // errorMessages is a humanly readable message looking like this :
                // 'The tag beginning with "foobar" is unopened'
            }
            throw error;
        }
        var out = doc.getZip().generate({
            type: "blob",
            mimeType:
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }); //Output the document using Data-URI

        const fileName = `Salary_Slip_${data.employeeId}_${format(data.dateObject, "MMM_yyyy")}`

        saveAs(out, fileName + ".docx");
        db.collection("employeeIds").doc(data.employeeId).set({
            pan: data.pan,
            bankName: data.bankName,
            bankAccountNo: data.bankAccountNo,
            dateOfJoining: data.dateOfJoining,
            dateOfSeperation: data.dateOfSeperation,
            monthlyGross: data.monthlyGross,
            monthlyBasic: data.monthlyBasic,
            basic: data.basic,
            conveyanceAllowance: data.conveyanceAllowance,
            incentive: data.incentive,
            incomeTax: data.incomeTax,
            arrears: data.arrears
        }).then(() => {
            store.dispatch(updateState());
            console.log("Document Written successfully");
        }).catch((error) => {
            store.dispatch(updateState());
            console.log("Error while writing document");
        });
    })
};

export default generateDoc;