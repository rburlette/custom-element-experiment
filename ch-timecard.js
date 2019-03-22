import {ooElement} from './oo.js';
import './ch-timecard-day.js';
const templateString = /*html*/`
<style>
    :host {
        display: flex;
    }
</style>
<ch-timecard-day oo-for="day in this.days" .daydata="{ day }" .services="{ this.services }" .payers="{ this.payers }"></ch-timecard-day>
`;


class chTimeCard extends ooElement {
    constructor() {
        super(templateString);
        this.initialize();
    }

    initialize() {
        this.services = [
            { name: 'Companion', value: 1 },
            { name: 'Homemaker', value: 2 },
            { name: 'Personal Care', value: 3 }
        ];

        this.payers = [
            { name: 'Elena Rodriquez', value: 1 },
            { name: 'BCBS Insurance', value: 2 },
            { name: 'C & H', value: 3 }
        ];

        this.days =  [
            {
                day: 'Sunday',
                date: new Date(2018, 4, 1),
                times: this.getTimes(new Date(2018, 4, 1)),
                shifts: [{
                    jobs:[
                        {
                            service: 1,
                            payerId: 2,
                            in: new Date(2018, 4, 1, 3, 15),
                            out: new Date(2018, 4, 1, 4, 45)
                        },
                        {
                            service: 2,
                            payerId: 2,
                            in: new Date(2018, 4, 1, 4, 45),
                            out: new Date(2018, 4, 1, 6)
                        }
                    ]
                }]
            },
            {
                day: 'Monday',
                date: new Date(2018, 4, 2),
                times: this.getTimes(new Date(2018, 4, 2)),
                shifts: [{
                    jobs:[
                        {
                            service: 3,
                            payerId: 2,
                            in: new Date(2018, 4, 2, 3, 15),
                            out: new Date(2018, 4, 2, 4, 45)
                        },
                        {
                            service: 1,
                            payerId: 2,
                            in: new Date(2018, 4, 2, 4, 45),
                            out: new Date(2018, 4, 2, 6)
                        },
                        {
                            service: 2,
                            payerId: 2,
                            in: new Date(2018, 4, 2, 6),
                            out: new Date(2018, 4, 2, 9)
                        }
                    ]
                }]
            },
            {
                day: 'Tuesday',
                date: new Date(2018, 4, 3),
                times: this.getTimes(new Date(2018, 4, 3)),

                shifts: [{
                    jobs:[
                        {
                            service: 3,
                            payerId: 2,
                            in: new Date(2018, 4, 3, 3, 15),
                            out: new Date(2018, 4, 3, 4, 45)
                        },
                        {
                            service: 2,
                            payerId: 2,
                            in: new Date(2018, 4, 3, 4, 45),
                            out: new Date(2018, 4, 3, 6)
                        }
                    ]
                }]
            },
            {
                day: 'Wednesday',
                date: new Date(2018, 4, 4),
                times: this.getTimes(new Date(2018, 4, 4)),
                shifts: [{
                    jobs:[
                        {
                            service: 2,
                            payerId: 2,
                            in: new Date(2018, 4, 4, 4, 45),
                            out: new Date(2018, 4, 4, 6)
                        }
                    ]
                }]

            },
            {
                day: 'Thursday',
                date: new Date(2018, 4, 5),
                times: this.getTimes(new Date(2018, 4, 5)),
                shifts: [{
                    jobs:[
                        {
                            service: 1,
                            payerId: 2,
                            in: new Date(2018, 4, 5, 3, 15),
                            out: new Date(2018, 4, 5, 4, 45)
                        },
                        {
                            service: 3,
                            payerId: 2,
                            in: new Date(2018, 4, 5, 4, 45),
                            out: new Date(2018, 4, 5, 6)
                        }
                    ]
                }]

            },
            {
                day: 'Friday',
                date: new Date(2018, 4, 6),
                times: this.getTimes(new Date(2018, 4, 6)),
                shifts: [{
                    jobs:[
                        {
                            service: 2,
                            payerId: 2,
                            in: new Date(2018, 4, 6, 3, 15),
                            out: new Date(2018, 4, 6, 4, 45)
                        }
                    ]
                }]

            },
            {
                day: 'Saturday',
                date: new Date(2018, 4, 7),
                times: this.getTimes(new Date(2018, 4, 7)),
                shifts: [{
                    jobs:[
                        {
                            service: 3,
                            payerId: 2,
                            in: new Date(2018, 4, 7, 3, 15),
                            out: new Date(2018, 4, 7, 4, 45)
                        },
                        {
                            service: 2,
                            payerId: 2,
                            in: new Date(2018, 4, 7, 4, 45),
                            out: new Date(2018, 4, 7, 6, 45)
                        }
                    ]
                }]
            }

        ];

        let day, shift, job;
        for(let i = 0; i < this.days.length; i++) {
            day = this.days[i];
            for(let k = 0; k < day.shifts.length; k++) {
                shift = day.shifts[k];
                shift.showDetails = false;

                shift.in = this.calcShiftIn(shift);
                shift.out = this.calcShiftOut(shift);
                shift.duration = this.calcDuration(shift);

                shift.needIn = new Date(shift.in);
                shift.needOut = new Date(shift.out);
                shift.needDuration = shift.duration;

                shift.maxTime = new Date(day.times[day.times.length - 1].value);

                for(let j = 0; j < shift.jobs.length; j++) {
                    job = shift.jobs[j];
                    job.needIn = new Date(job.in);
                    job.needOut = new Date(job.out);
                    job.duration = this.calcDuration(job);
                    job.needDuration = job.duration;
                    job.isNew = false;
                }
            }
        }
    }

    showDetails(shift, job) {
        return (shift.showDetails || job.isNew);
    }

    payerOnChange(item, value) {
        item.payerId = value;
    }

    serviceOnChange(item, value) {
        item.service = value;
        this.boundRoot.refresh();
    }

    addTime(item, context, timeDiff) {
        this.changeService(context.parent.item, item.service, timeDiff);
        context.parent.item.out = this.calcShiftOut(context.parent.item);
        context.parent.item.duration = this.calcDuration(context.parent.item);
        this.boundRoot.refresh();
    }

    toggleDetails(shift) {
        shift.showDetails = !shift.showDetails;
        this.boundRoot.refresh();
    }

    isDisabled(item, context) {
        return item.date.getTime() < context.parent.item.in.getTime();
    }

    formatDate(date) {
        return (date.getMonth() + 1) + '/' + date.getDate() + '/' + date.getFullYear();
    }

    getTimes(currentDate) {
        let myDay = new Date(currentDate);

        let dateNum = myDay.getDate();

        let times = [];

        while(myDay.getDate() === dateNum) {
            var hr = myDay.getHours();

            var min = myDay.getMinutes();

            if (min < 10) {
                min = '0' + min;
            }
            var ampm = 'AM';
            if( hr > 12 ) {
                hr -= 12;
                ampm = 'PM';
            }

            times.push({
                text: hr + ':' + min + ' ' + ampm,
                value: myDay.toJSON(),
                date: new Date(myDay)
            });

            myDay.setMinutes(myDay.getMinutes() + 15);
        }

        times.push({
            text: 'End of Day',
            value: myDay.toJSON(),
            date: new Date(myDay)
        });

        return times;
    }

    calcShiftIn(shift) {
        let min;
        for(let i = 0; i < shift.jobs.length; i++) {
            if(!min || shift.jobs[i].in.getTime() < min)
                min = shift.jobs[i].in.getTime();
        }
        return new Date(min);
    }

    calcShiftOut(shift) {
        let max;
        for(let i = 0; i < shift.jobs.length; i++) {
            if(!max || shift.jobs[i].out.getTime() > max)
                max = shift.jobs[i].out.getTime();
        }
        return new Date(max);
    }

    getRemainingServices(shift, currentJob) {
        let hasService = [false, false, false];

        for(let i = 0; i < shift.jobs.length; i++) {
            hasService[shift.jobs[i].service - 1] = true;
        }

        if(currentJob) {
            hasService[currentJob.service - 1] = false;
        }

        let availableServices = [];

        for(let i = 0; i < this.services.length; i++) {
            if(hasService[i] == false) {
                availableServices.push(this.services[i]);
            }
        }

        return availableServices;
    }

    addService(shift) {
        let lastJob = shift.jobs[shift.jobs.length - 1];

        let newJob = {
            payerId: lastJob.payerId,
            isNew: true,
            in: new Date(lastJob.out),
            out: new Date(lastJob.out.getTime() + (900000 * 4))
        };

        newJob.duration = this.calcDuration(newJob);

        newJob.service = this.getRemainingServices(shift)[0].value;

        shift.jobs.push(newJob);

        shift.out = this.calcShiftOut(shift);
        shift.duration = this.calcDuration(shift);

        this.boundRoot.refresh();
    }

    changeShiftIn(shift, value) {
        let timeDiff = new Date(value) - shift.in;

        shift.jobs.forEach(function(job) {
            job.in.setTime(job.in.getTime() + timeDiff);
            job.out.setTime(job.out.getTime() + timeDiff);
            job.duration = this.calcDuration(job);
        }, this);

        shift.in = this.calcShiftIn(shift);
        shift.out = this.calcShiftOut(shift);

        if(shift.out.getTime() > shift.maxTime.getTime())
            this.changeEndShift(shift, shift.maxTime);

        shift.duration = this.calcDuration(shift);

        this.boundRoot.refresh();
    }

    changeShiftOut(shift, value) {
        this.changeEndShift(shift, new Date(value));
        this.boundRoot.refresh();
    }

    inClass(shift){
        if(shift.isNew || (shift.needIn && shift.in.getTime() !== shift.needIn.getTime()))
            return 'changed';
    }

    outClass(shift) {
        if(shift.isNew || (shift.needOut && shift.out.getTime() !== shift.needOut.getTime()))
            return 'changed';
    }

    durationClass(item) {
        if(item.isNew || (item.needDuration && item.needDuration != item.duration))
            return 'changed';
    }

    jobClass(item) {
        let myClass =  ['companion', 'personal', 'home'][item.service - 1];
        if(item.isNew)
            myClass += ' is-new';

        return myClass;
    }

    calcDuration(item) {
        return Math.abs(item.out - item.in) / 36e5;
    }

    changeEndShift(shift, newTime) {

        let timeDiff = newTime - shift.out;

        timeDiff = this.changeService(shift, 1, timeDiff);
        timeDiff = this.changeService(shift, 2, timeDiff);
        this.changeService(shift, 3, timeDiff);


        shift.out = this.calcShiftOut(shift);
        shift.duration = this.calcDuration(shift);
    }

    changeService(shift, service, timeDiff) {
        if(timeDiff === 0)
            return 0;

        let serviceIndex = this.services.length;
        let actualTimeDiff = timeDiff;
        shift.jobs.forEach(function(job, index) {

            if(job.service == service) {
                if(timeDiff < 0)
                    actualTimeDiff = Math.max(timeDiff, job.in.getTime() - job.out.getTime());

                serviceIndex = index;

                job.out.setTime(job.out.getTime() + actualTimeDiff);
                job.duration = this.calcDuration(job);
            }

            if(index > serviceIndex) {
                job.in.setTime(job.in.getTime() + actualTimeDiff);
                job.out.setTime(job.out.getTime() + actualTimeDiff);
                job.duration = this.calcDuration(job);
            }
        }, this);

        if(serviceIndex < this.services.length)
            return timeDiff - actualTimeDiff;
        else
            return timeDiff;
    }

    addShift(day) {
        let prevShift = day.shifts[day.shifts.length - 1];
        let prevJob = prevShift.jobs[prevShift.jobs.length - 1];

        let newShift = {
            jobs:[
                {
                    service: 1,
                    payerId: 2,
                    in: new Date(prevJob.out.getTime() + (900000 * 4)),
                    out: new Date(prevJob.out.getTime() + (900000 * 8)),
                    isNew: true
                }
            ],
            isNew: true,
            maxTime: new Date(day.times[day.times.length - 1].value)
        };

        newShift.jobs[0].duration = this.calcDuration(newShift.jobs[0]);

        newShift.in = this.calcShiftIn(newShift);
        newShift.out = this.calcShiftOut(newShift);

        newShift.duration = this.calcDuration(newShift);

        day.shifts.push(newShift);
    }
}

customElements.define('ch-timecard', chTimeCard);