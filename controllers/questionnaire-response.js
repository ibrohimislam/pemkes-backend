var express = require('express');
var router = express.Router();
const fetch = require('node-fetch');

function getGenderFromQuestionaireResponse(questionnaireResponse) {
  const genderAnswer = questionnaireResponse.item.find(it => it.linkId === "gender")
  switch (genderAnswer.answer?.[0]?.valueString) {
    case "Laki-laki":
      return [{
        "op": "add",
        "path": "/gender",
        "value": "male"
      }]
    case "Perempuan":
      return [{
        "op": "add",
        "path": "/gender",
        "value": "female"
      }]
    default:
    case "Other":
      return [{
        "op": "add",
        "path": "/gender",
        "value": "other"
      }]
  }
}

function getNim(questionnaireResponse) {
  const nimAnswer = questionnaireResponse.item.find(it => it.linkId === "nim-mahasiswa")
  if (nimAnswer.answer?.[0]?.valueString) {
    return [{
      "op": "add",
      "path": "/identifier/-",
      "value": {
       "use": "official",
       "type": {
        "coding": [
         {
          "system": "http://hl7.org/fhir/v2/0203",
          "code": "PI",
          "display": "Patient internal identifier"
         }
        ],
        "text": "Patient internal identifier"
       },
       "system": "NPM/NIP",
       "value": nimAnswer.answer?.[0]?.valueString
      }
    }]
  }
  return []
}

function getMaritalStatus(questionnaireResponse) {
  const maritalStatusAnswer = questionnaireResponse.item.find(it => it.linkId === "status-pernikahan")
  switch (maritalStatusAnswer.answer?.[0]?.valueString) {
    case "Sudah Menikah":
      return [{
        "op": "add",
        "path": "/maritalStatus",
        "value": {
        "coding": [
          {
          "system": "https://www.hl7.org/fhir/valueset-marital-status.html",
          "code": "M",
          "display": "Menikah"
          }
        ],
        "text": "Menikah"
        }
      }]
    case "Belum Menikah":
      return [{
        "op": "add",
        "path": "/maritalStatus",
        "value": {
        "coding": [
          {
          "system": "https://www.hl7.org/fhir/valueset-marital-status.html",
          "code": "S",
          "display": "Single"
          }
        ],
        "text": "Single"
        }
      }]
    case "Duda/Janda":
      return [{
        "op": "add",
        "path": "/maritalStatus",
        "value": {
        "coding": [
          {
          "system": "https://www.hl7.org/fhir/valueset-marital-status.html",
          "code": "W",
          "display": "Janda/Duda"
          }
        ],
        "text": "Janda/Duda"
        }
      }]
    default:
      []
  }
}

function getEmailAddress(questionnaireResponse) {
  const emailAddressAnswer = questionnaireResponse.item.find(it => it.linkId === "alamat-email")
  if (emailAddressAnswer.answer?.[0]?.valueString) {
    return [{
      "op": "add",
      "path": "/telecom/-",
      "value": {
       "system": "email",
       "value": emailAddressAnswer.answer?.[0]?.valueString
      }
    }]
  }
  return []
}

function getBpjsNumber(questionnaireResponse) {
  const bpjsNumberAnswer = questionnaireResponse.item.find(it => it.linkId === "nomor-bpjs")
  if (bpjsNumberAnswer.answer?.[0]?.valueString) {
    return [{
      "op": "add",
      "path": "/identifier/-",
      "value": {
       "use": "official",
       "type": {
        "coding": [
         {
          "system": "http://hl7.org/fhir/v2/0203",
          "code": "SN",
          "display": "Subscriber Number"
         }
        ],
        "text": "Subscriber Number"
       },
       "system": "BPJS",
       "value": bpjsNumberAnswer.answer?.[0]?.valueString
      }
    }]
  }
  return []
}

function getAlamatDomisili(questionnaireResponse) {
  const alamatAnswer = questionnaireResponse.item.find(it => it.linkId === "alamat-domisili")
  if (alamatAnswer.answer?.[0]?.valueString) {
    return [{
      "op": "add",
      "path": "/address",
      "value": [
       {
        "use": "home",
        "line": alamatAnswer.answer?.[0]?.valueString.split('\n'),
        "country": "Indonesia"
       }
      ]
    }]
  }
  return []
}

router.put('/:id', async function(req, res) {
  try {
    const questionnaireResponse = req.body;
    const bundle = {
      resourceType: 'Bundle',
      type: 'transaction',
      entry: [{
        fullUrl: questionnaireResponse.subject.reference,
        resource: {
          resourceType: 'Binary',
          contentType: 'application/json-patch+json',
          content: btoa(
            JSON.stringify([
              ...getGenderFromQuestionaireResponse(questionnaireResponse),
              ...getNim(questionnaireResponse),
              ...getMaritalStatus(questionnaireResponse),
              ...getEmailAddress(questionnaireResponse),
              ...getBpjsNumber(questionnaireResponse),
              ...getAlamatDomisili(questionnaireResponse),
            ])
          ),
        },
        request: {
          url: questionnaireResponse.subject.reference,
        }
      }]
    }
    console.log(`${process.env.FHIR_ENDPOINT}`);
    const response = await fetch(`${process.env.FHIR_ENDPOINT}`, { method: 'POST', headers: {'Content-Type': 'application/fhir+json'}, body: JSON.stringify(bundle)});
    if (response.ok) {
      console.log({ response: await response.text() })
      return res.status(200).json({
        status: 'success',
        message: 'Successfully updated'
      })
    }
    console.log({ response: await response.text() })
    return res.status(500).json({
      status: 'failed',
      message: 'Failed to update'
    })
  } catch (e) {
    console.error(e)
    return res.status(400).json({
      status: 'failed',
      message: 'Failed to update'
    })
  }
});

module.exports = router;
