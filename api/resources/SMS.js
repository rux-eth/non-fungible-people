// load .env
require("dotenv").config();

// AWS
const AWS = require("aws-sdk");

// send SMS notifications
const sendSMS = async (subject, to, text) => {
  const params = {
    Message: text,
    PhoneNumber: `+${to}`,
    MessageAttributes: {
      "AWS.SNS.SMS.SenderID": {
        DataType: "String",
        StringValue: subject,
      },
    },
  };

  return new AWS.SNS({ apiVersion: "2010-03-31" }).publish(params).promise();
};

module.exports = sendSMS;
