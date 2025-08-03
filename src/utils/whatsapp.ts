// curl -X POST \
//      -H "Authorization: AICUE AISEECLIENT_FFPLDHARWAD:QUlTRUVWSVZBUkFOX0ZGUExLT0xBQklSQQo"\
//      -H "Content-Type: application/json" \
//      -d '{
//             "phoneNumber": "919841570969",
//             "templateName": "part_inspection_fail",
//             "language": "en",
//             "variables": ["p1","p2","p3","p4"],
//             "imageUrl": ""
//      }'\
//     "https://epatra.padma-ai.com/v1/whatsapp/send" ;
import axios from "axios";
import dotenv from "dotenv";


dotenv.config();




const WA_URL = "https://epatra.padma-ai.com/v1/whatsapp/send";

export async function sendWhatsAppMessage(
    phoneNumber: string,
    templateName: string,
    variables: string[],
    imageUrl: string = "",
): Promise<void> {

    let authorization_string = `AICUE ${process.env.APP_KEY}:${process.env.APP_SECRET}`;
    let send_json = {
        phoneNumber: phoneNumber,
        templateName: templateName,
        language: "en",
        variables: variables,
        imageUrl: imageUrl,
    };
    try {
        let response = await axios.post(
            WA_URL,
            send_json,
            {
                headers: {
                    Authorization: authorization_string,
                    "Content-Type": "application/json",
                }
            }
        );
        // console.log("WhatsApp message sent successfully:", response.data);
    }
    catch (error) {
        console.error("Error sending WhatsApp message:", error);
        throw error;
    }
}