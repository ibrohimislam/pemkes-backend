const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0

function humanNameToString(name) {
  if (name) {
    if (name.family) {
      return name.given
        ? name.given.join(' ') + ' ' + name.family
        : name.family;
    }
    if (name.given) {
      return name.given.join(' ');
    }
  }
  return 'No Name';
}

function patientGenderMap(gender) {
  switch (gender) {
    case "male":
      return "M"
    case "female":
      return "F"
    case "other":
    default:
      return "O"
  }
}

function patientPhone(patient) {
  return patient.telecom.find(it => it.system === "phone")?.value || "-"
}

function patientEmail(patient) {
  return patient.telecom.find(it => it.system === "email")?.value || "-"
}

function patientAddress(address) {
  if (address?.[0]) {
    return address[0].line.join(' ')
  }
  return '-'
}

router.put('/:id', async function(req, res) {
  try {
    const appointment = req.body;
    const patientParticipant = appointment.participant.find(it => it.actor.reference.split('/')[0] === "Patient");
    const patientId = patientParticipant.actor.reference.split('/')[1];
    const patientRequest = await fetch(`${process.env.FHIR_ENDPOINT}/Patient/${patientId}`)
    const patient = await patientRequest.json();
  
    const response = await fetch(process.env.RSUI_REGISTRATION_ENDPOINT, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        "identification_no": patient.identifier.find(it => it.system === "KTP")?.value,
        "name": humanNameToString(patient.name[0]),
        "gender": patientGenderMap(patient.gender),
        "place_of_birth": "-",
        "date_of_birth": patient.birthDate,
        "mobile_phone": patientPhone(patient),
        "email": patientEmail(patient),
        "home_address": patientAddress(patient.address),
        "rt": "001",
        "rw": "001",
        "tgl_registrasi": appointment.start.split('T')[0],
        "api_token": process.env.RSUI_REGISTRATION_TOKEN
      })
    })
    
    if (response.ok) {
      return res.status(200).json(await response.json());
    }
    console.log(await response.text());
    return res.status(500).json(await response.json())
  } catch (e) {
    console.error(e);
    return res.status(400).json({ error: e.message });
  }
});

module.exports = router;
