import "construct-style-sheets-polyfill"
import "whatwg-fetch"
import { cssomSheet, setup, tw } from "twind"
import { withForms } from "@twind/forms"
import * as colors from 'twind/colors'

const sheet = cssomSheet({ target: new CSSStyleSheet() })

setup({
  preflight: withForms(),
  theme: {
    extend: {
      colors
    }
  },
  sheet: sheet
})

class MakePlansBookingCalendarSlot extends HTMLElement {
  constructor(slot) {
    super()

    this.service               = slot.service
    this.availableResources    = slot.available_resources
    this.free                  = slot.free
    this.maximumCapacity       = slot.maximum_capacity
    this.timestamp             = slot.timestamp
    this.timestampEnd          = slot.timestamp_end
    this.formattedTimestamp    = slot.formatted_timestamp
    this.formattedTimestampEnd = slot.formatted_timestamp

    this.locale = new Intl.DateTimeFormat().resolvedOptions().locale

    this.startDay = new Intl
      .DateTimeFormat(this.locale, { dateStyle: "full" })
      .format(new Date(this.timestamp))

    this.startTime = new Intl
      .DateTimeFormat(this.locale, { timeStyle: "short" })
      .format(new Date(this.timestamp))

    this.endTime = new Intl
      .DateTimeFormat(this.locale, { timeStyle: "short" })
      .format(new Date(this.timestampEnd))

    this.attachShadow({
      mode: "open"
    })
  }

  connectedCallback() {
    this.render()
  }

  render() {
    this.shadowRoot.innerHTML = `
      <fieldset id="${this.timestamp}" class="${tw`border-t`}">
        <legend class="${tw`text-lg`}">${this.startDay}</legend>

        <a href="#${this.timestamp}" class="${tw`p-4 text-underline`}">
          ${this.startTime} - ${this.endTime}
        </a>

        <input type="hidden" name="booking[booked_from]" value="${this.timestamp}">
        <input type="hidden" name="booking[booked_to]" value="${this.timestampEnd}">
        <input type="hidden" name="booking[service_id]" value="${this.service.id}">
        <input type="hidden" name="booking[public_booking]" value="true">
      </fieldset>`

    return this.shadowRoot.innerHTML
  }
}

customElements.define("makeplans-booking-calendar-slot", MakePlansBookingCalendarSlot)

class MakePlansBookingCalendar extends HTMLElement {
  constructor() {
    super()

    this._from = new Intl
      .DateTimeFormat("en-ca")
      .format(Date.now())

    this._to = ""

    this.attachShadow({mode: "open"})

    this.shadowRoot.adoptedStyleSheets = [sheet.target]
  }

  connectedCallback() {
    Promise.all(this.fetchData())
      .then(data => {
        this.render()

        this.addEventListeners()
      })
  }

  fetchData() {
    const servicePromise = fetch(this.siteUrl + `/services/${this.serviceId}`, {
      headers: {
        Accept: "application/json"
      }
    })
      .then(reponse => reponse.json())
      .then(data => {
        this._service = data.service
      })

    const slotsPromise = fetch(this.siteUrl + `/services/${this.serviceId}/slots?from=${this.from}`, {
      headers: {
        Accept: "application/json"
      }
    })
      .then(reponse => reponse.json())
      .then(slots => {
        this._slots = slots
      })

    return [servicePromise, slotsPromise]
  }

  render() {
    const template = document.createElement("template")

    template.innerHTML = `
      <div id="booking_calendar" class="${tw`flex flex-col p-4 gap-7`}">
        <h3 id="booking-service-title" class="${tw`text-xl font-medium`}">
          ${this.service.title}
        </h3>

        <form action=${this.siteUrl}/services/${this.serviceId}/slots method="post" id="booking_date_filter" class="${tw`px-4`}">
          <div class="${tw`flex gap-4`}">
            <div class="${tw`flex flex-col`}">
              <label for="from" class="${tw`text-sm text-gray-900`}">Select a date</label>
              <input type="date" name="from" id="from" value="${this.from}" class="${tw`border-t-0 border-b border-x-0 focus:ring-0 focus:bg-gray-100`}" />
             <input type="hidden" name="to" value="${this.to}" />
            </div>
          </div>
        </form>

        <form action="${this.siteUrl + `/bookings`}" method="post" id="booking_form" class="${tw`px-4`}">
          <div id="time_slots" class="${tw`flex flex-col gap-4`}">
          </div>

          <div id="modal" class="${tw`absolute inset-0 flex hidden w-full h-full bg-black bg-opacity-80`}">
            <fieldset id="person_info_fields" class="${tw`absolute flex flex-col left-[25%] gap-14 mt-20 w-1/2 p-8 mx-auto my-0
            items-center bg-white rounded`}" form="booking_form">
              <div class="${tw`flex flex-col w-1/2 mx-auto my-0 gap-4`}">
                <div class="${tw`flex flex-col`}">
                  <label for="booking_person_attributes_name">Name</label>
                  <input type="text" name="booking[person_attributes][name]"
                    id="booking_person_attributes_name"
                    class="${tw`border-0 border-b focus:ring-0 focus:bg-gray-100`}" form="booking_form">
                </div>

                <div class="${tw`flex flex-col`}">
                  <label for="booking_person_attributes_email">Email</label>
                  <input type="text" name="booking[person_attributes][email]"
                    id="booking_person_attributes_email"
                    class="${tw`border-0 border-b focus:ring-0 focus:bg-gray-100`}" form="booking_form">
                </div>

                <div class="${tw`flex flex-col`}">
                  <label for="booking_person_attributes_phone_number">Mobile phone number</label>
                  <input type="text" name="booking[person_attributes][phone_number]"
                    id="booking_person_attributes_phone_number"
                    class="${tw`border-0 border-b focus:ring-0 focus:bg-gray-100`}" form="booking_form">
                </div>

              </div>
              <div class="${tw`flex self-end gap-6`}">
                <button type="button" id="cancel" class="${tw`hover:text-underline active:outline-none`}">Cancel</button>
                <button type="submit" class="${tw`p-4 text-white bg-black rounded`}" form="booking_form">Confirm booking</button>
              </div>
            </fieldset>
          </div>
        </form>
      </div>`

    if (this.shadowRoot.firstElementChild) {
      this.shadowRoot.removeChild(this.shadowRoot.firstElementChild)
    }

    this.shadowRoot.appendChild(template.content.cloneNode(true))

    this.slots.forEach(slot => {
      slot.service = this.service

      let timeSlotElement = new MakePlansBookingCalendarSlot(slot)

      this.timeSlotsTarget
        .insertAdjacentHTML("beforeend", timeSlotElement.render())
    })

    return this.shadowRoot.innerHTML
  }

  addEventListeners() {
    this.submit()
    this.changeDate()
    this.showPersonInfoFields()
    this.hidePersonInfoFields()
  }

  submit() {
    this.bookingFormTarget
      .addEventListener("submit", (event) => {
        event.preventDefault()

        Array.from(this.timeSlotsTarget.children).forEach((timeSlotTarget) => {
          if (!this.isSelectedTimeSlot(timeSlotTarget)) {
            timeSlotTarget.setAttribute("disabled", "")
          }
        })

        const form     = event.target
        const formData = new FormData(form)

        const payload = {
          "booking": {
            "booked_from": formData.get("booking[booked_from]"),
            "booked_to": formData.get("booking[booked_to]"),
            "service_id": formData.get("booking[service_id]"),
            "public_booking": formData.get("booking[public_booking]"),
            "person_attributes": {
              "name": formData.get("booking[person_attributes][name]"),
              "email": formData.get("booking[person_attributes][email]"),
              "phone_number": formData.get("booking[person_attributes][phone_number]")
            }
          }
        }

        const requestHeaders = new Headers({
          "Accept": "application/json",
          "Content-type": "application/json"
        })

        const requestOptions = {
          method: "POST",
          headers: requestHeaders,
          body: JSON.stringify(payload)
        }

        fetch(form.action, requestOptions)
          .then(response => response.json())
          .then(data => {
            const booking = data.booking

            console.log(booking)

            const locale = new Intl.DateTimeFormat().resolvedOptions().locale

            const date = new Intl
              .DateTimeFormat(locale, { dateStyle: "full" })
              .format(new Date(booking.booked_from))

            const from = new Intl
              .DateTimeFormat(locale, { timeStyle: "short" })
              .format(new Date(booking.booked_from))

            const to = new Intl
              .DateTimeFormat(locale, { timeStyle: "short" })
              .format(new Date(booking.booked_to))

            alert(`You made a reservation for ${booking.service.title}, ${date}, ${from} - ${to}`)

            this.removeAnchor()

            this.connectedCallback()
          })
      })
  }

  changeDate() {
    this.bookingDateFilterTarget
      .addEventListener("change", (event) => {
        const target = event.target

        if (target.type == "date") {
          this._from = target.value
          this._to   = target.value

          this.connectedCallback()
        }
      })
  }

  showPersonInfoFields() {
    this.timeSlotsTarget
      .addEventListener("click", (event) => {
        const target   = event.composedPath()[0]
        const timeSlot = target.closest("fieldset")

        if (timeSlot) {
          this.modalTarget.classList.remove("hidden")
        }
      })
  }

  hidePersonInfoFields() {
    this.cancelButtonTarget
      .addEventListener("click", (event) => {
        event.preventDefault()

        this.modalTarget.classList.add("hidden")

        this.removeAnchor()
      })
  }

  isSelectedTimeSlot(timeSlot) {
    return location.href.endsWith(`#${timeSlot.id}`)
  }

  removeAnchor() {
    location.href = location.origin + location.pathname
  }

  get from() {
    return this._from
  }

  get to() {
    return this._to
  }

  get siteUrl() {
    return this.getAttribute("site-url")
  }

  get serviceId() {
    return this.getAttribute("service-id")
  }

  get service() {
    return this._service
  }

  get slots() {
    return this._slots
  }

  get bookingDateFilterTarget() {
    return this.shadowRoot.getElementById("booking_date_filter")
  }

  get bookingFormTarget() {
    return this.shadowRoot.getElementById("booking_form")
  }

  get timeSlotsTarget() {
    return this.shadowRoot.getElementById("time_slots")
  }

  get modalTarget() {
    return this.shadowRoot.getElementById("modal")
  }

  get personInfoFields() {
    return this.shadowRoot.getElementById("person_info_fields")
  }

  get cancelButtonTarget() {
    return this.shadowRoot.getElementById("cancel")
  }
}

customElements.define("makeplans-booking-calendar", MakePlansBookingCalendar)
