// curl -X POST \
//      -H "Authorization: AICUE key1:secret1"\
//      -H "Content-Type: application/json" \
//      -d '{
//          "from": "kriya@aicuedatalab.com",
//          "to": "karthik@aicuedatalab.com, herr.karthik@gmail.com",
//          "subject": "Test Email",
//          "text": "This is a test email.",
//          "html": "<H1>This is a test email.</H1>{{email_id}}"
//      }'\
//     "https://epatra.padma-ai.com/v1/email/kriya" ;

import axios from "axios";
import dotenv from "dotenv";


dotenv.config();




const EMAIL_URL = "https://epatra.padma-ai.com/v1/email/kriya";

export async function sendEmailMessage(
    emails: string,
    subject: string,
    textMail: string,
    htmlMail: string
): Promise<void> {

    let authorization_string = `AICUE ${process.env.APP_KEY}:${process.env.APP_SECRET}`;
    let send_json = {
        from: "kriya@aicuedatalab.com",
        to: emails,
        subject: subject,
        text: textMail,
        html: htmlMail,
    };
    try {
        let response = await axios.post(
            EMAIL_URL,
            send_json,
            {
                headers: {
                    Authorization: authorization_string,
                    "Content-Type": "application/json",
                }
            }
        );
        console.log("Email message sent successfully:", response.data);
    }
    catch (error) {
        console.error("Error sending Email message:", error);
        throw error;
    }
}