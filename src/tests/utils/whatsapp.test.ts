import { sendWhatsAppMessage } from "../../utils/whatsapp";

describe("sendWhatsAppMessage", () => {
    it("should send a WhatsApp message with the correct parameters", async () => {
        const phoneNumber = "919841570969";
        const templateName = "part_inspection_fail";
        const variables = ["p1", "p2", "p3", "p4"];
        const imageUrl = "";

        await sendWhatsAppMessage(phoneNumber, templateName, variables, imageUrl);

        console.log("Message sent successfully. Check your phone for confirmation.");
    });
});
