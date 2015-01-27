/*!  Copyright (c) 2013 Zallist

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.
*/
/*! Project location: https://github.com/Zallist/self */

// Visual Studio references

/// <reference path="jquery-1.9.1.min.js" />
/// <reference path="jquery-ui-1.10.2.custom.min.js" />
/// <reference path="moment.min.js" />

/*globals $, moment, document, clearTimeout, setTimeout*/
var TimeScheduler = function (Config) {
    'use strict';
    var self = this;
    self.Options = {
        /* The function to call to fill up Sections.
         Sections are cached. To clear cache, use TimelineScheduler.FillSections(true);
         Callback accepts an array of sections in the format {
         id: num,
         name: string
         }
         */
        GetSections: function (callback) {
            callback("Undefined function");
        },

        /* The function to call to fill up Items.
         Callback accepts an array of items in the format
         {
         id: num,
         name: string,
         sectionID: ID of Section,
         start: Moment of the start,
         end: Moment of the end,
         classes: string of classes to add,
         events: [
         {
         label: string to show in tooltip,
         at: Moment of event,
         classes: string of classes to add
         }
         ]
         }
         */
        GetSchedule: function (callback, start, end) {
            start = false;
            end = false;
            callback("undefined function", start, end);
        },

        /* The Moment to start the calendar at. RECOMMENDED: .startOf('day') */
        Start: moment(),

        /* The Moment format to use when displaying Header information */
        HeaderFormat: 'Do MMM YYYY',

        /* The Moment format to use when displaying Tooltip information */
        LowerFormat: 'DD-MMM-YYYY HH:mm',

        /* An array of Periods to be selectable by the user in the form of {
         Name: unique string name to be used when selecting,
         Label: string to display on the Period Button,
         TimeframePeriod: number of minutes between intervals on the scheduler,
         TimeframeOverall: number of minutes between the Start of the period and the End of the period,
         TimeframeHeaderFormats: Array of formats to use for headers.
         }
         */
        Periods: [
            {
                Name: '2 days',
                Label: '2 days',
                TimeframePeriod: 120,
                TimeframeOverall: 2880,
                TimeframeHeaders: [
                    'Do MMM',
                    'HH'
                ],
                Classes: 'time-sch-period-2day'
            },
            {
                Name: '2 weeks',
                Label: '2 weeks',
                TimeframePeriod: 1440,
                TimeframeOverall: 20160,
                TimeframeHeaders: [
                    'MMM',
                    'Do'
                ],
                Classes: 'time-sch-period-2week'
            }
        ],

        /* The Name of the period to select */
        SelectedPeriod: '2 weeks',

        /* The Element to put the scheduler on */
        Element: $('<div></div>'),

        /* The minimum height of each section */
        MinRowHeight: 40,

        /* Whether to show the Current Time or not */
        ShowCurrentTime: true,

        /* Whether to show the Goto button */
        ShowGoto: true,

        /* Whether to show the Today button */
        ShowToday: true,

        /* Text to use when creating the scheduler */
        Text: {
            NextButton: 'Next',
            NextButtonTitle: 'Next period',
            PrevButton: 'Prev',
            PrevButtonTitle: 'Previous period',
            TodayButton: 'Today',
            TodayButtonTitle: 'Go to today',
            GotoButton: 'Go to',
            GotoButtonTitle: 'Go to specific date'
        },

        Events: {
            // function (item) { }
            ItemMouseEnter: null,

            // function (item) { }
            ItemMouseLeave: null,

            // function (item) { }
            ItemClicked: null,

            // function (item, sectionID, start, end) { }
            ItemDropped: null,

            // function (item, start, end) { }
            ItemResized: null,

            // function (item, start, end) { }
            // Called when any item move event is triggered (draggable.drag, resizable.resize)
            ItemMovement: null,
            // Called when any item move event starts (draggable.start, resizable.start)
            ItemMovementStart: null,
            // Called when any item move event ends (draggable.end, resizable.end)
            ItemMovementEnd: null,

            // function (eventData, itemData)
            ItemEventClick: null,

            // function (eventData, itemData)
            ItemEventMouseEnter: null,

            // function (eventData, itemData)
            ItemEventMouseLeave: null,

            ItemEventClicked: null
        },

        // Should dragging be enabled?
        AllowDragging: false,

        OnlyXAxis : false,

        // Should resizing be enabled?
        AllowResizing: false,

        AllowCollapseSections : true,

        // Disable items on moving?
        DisableOnMove: true,

        // A given max height for the calendar, if unspecified, will expand forever
        MaxHeight: null,

        UseSectionsWrapper: true
    };
    self.Wrapper = null;
    self.HeaderWrap = null;
    self.TableWrap = null;
    self.ContentHeaderWrap = null;
    self.ContentWrap = null;
    self.TableHeader = null;
    self.TableContent = null;
    self.SectionWrap = null;
    self.Table = null;
    self.Sections = {};
    self.CachedSectionResult = null;
    self.CachedScheduleResult = null;
    self.SetupPrototypes = function () {
        moment.fn.tsAdd = function (input, val) {
            var dur;
            // switch args to support add('s', 1) and add(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            this.tsAddOrSubtractDurationFromMoment(this, dur, 1);
            return this;
        };
        moment.fn.tsSubtract = function (input, val) {
            var dur;
            // switch args to support subtract('s', 1) and subtract(1, 's')
            if (typeof input === 'string') {
                dur = moment.duration(+val, input);
            } else {
                dur = moment.duration(input, val);
            }
            this.tsAddOrSubtractDurationFromMoment(this, dur, -1);
            return this;
        };
        // Replace the AddOrSubtract function so that zoning is not taken into account at all
        moment.fn.tsAddOrSubtractDurationFromMoment = function (mom, duration, isAdding) {
            var ms = duration._milliseconds,
                d = duration._days,
                M = duration._months,
                currentDate;

            if (ms) {
                mom.milliseconds(mom.milliseconds() + ms * isAdding);
                //mom._d.setTime(+mom + ms * isAdding);
            }
            if (d) {
                mom.date(mom.date() + d * isAdding);
            }
            if (M) {
                currentDate = mom.date();
                mom.date(1)
                    .month(mom.month() + M * isAdding)
                    .date(Math.min(currentDate, mom.daysInMonth()));
            }
        };
    };

    /* Initializes the Timeline Scheduler with the given opts. If omitted, defaults are used. */
    /* This should be used to recreate the scheduler with new defaults or refill items */
    self.Init = function (overrideCache) {
        self.SetupPrototypes();

        self.Options.Start = moment(self.Options.Start);

        self.Options.Element.find('.ui-draggable').draggable('destroy');
        self.Options.Element.empty();

        self.Wrapper = $(document.createElement('div'))
            .addClass('time-sch-wrapper')
            .appendTo(self.Options.Element);

        self.HeaderWrap = $(document.createElement('div'))
            .addClass('time-sch-header-wrapper time-sch-clearfix')
            .appendTo(self.Wrapper);

        self.TableWrap = $(document.createElement('div'))
            .addClass('time-sch-table-wrapper')
            .appendTo(self.Wrapper);
        self.CreateCalendar();

        self.FillSections(overrideCache);
    };

    self.GetSelectedPeriod = function () {
        var period,
            i;

        for (i = 0; i < self.Options.Periods.length; i++) {
            if (self.Options.Periods[i].Name === self.Options.SelectedPeriod) {
                period = self.Options.Periods[i];
                break;
            }
        }

        if (!period) {
            period = self.Options.Periods[0];
            self.SelectPeriod(period.Name);
        }

        return period;
    };

    self.GetEndOfPeriod = function (start, period) {
        return moment(start).tsAdd('minutes', period.TimeframeOverall);
    };

    self.AddHeaderClasses = function (td, columnCount, specificHeader) {
        var trs, trArray, tr,
            tdArray, foundTD,
            prevIndex, nextIndex, colspan,
            complete, isEven,
            trCount,
            tdCount;
        trs = self.TableHeader.find('tr');

        if (specificHeader !== undefined) {
            trs = $(trs.get(specificHeader));
        }

        if (trs.length && trs.length > 0) {
            trArray = $.makeArray(trs);

            for (trCount = 0; trCount < trArray.length; trCount++) {
                complete = false;
                nextIndex = 0;
                tr = $(trArray[trCount]);
                tdArray = $.makeArray(tr.find('.time-sch-date-header'));

                for (tdCount = 0; tdCount < tdArray.length && !complete; tdCount++) {
                    foundTD = $(tdArray[tdCount]);

                    colspan = Number(foundTD.attr('colspan'));
                    if (colspan && !isNaN(colspan) && colspan > 0) {
                        prevIndex = nextIndex || 0;
                        nextIndex = prevIndex + colspan;
                    } else {
                        prevIndex = nextIndex || 0;
                        nextIndex = prevIndex + 1;
                    }

                    if (prevIndex === columnCount) {
                        td.addClass('time-sch-header-' + trCount + '-date-start');
                    }
                    if (nextIndex - 1 === columnCount) {
                        td.addClass('time-sch-header-' + trCount + '-date-end');
                    }

                    if (prevIndex <= columnCount && columnCount < nextIndex) {
                        complete = true;
                        isEven = tdCount % 2 === 0;

                        td.addClass('time-sch-header-' + trCount + '-date-column-' + tdCount)
                            .addClass('time-sch-header-' + trCount + '-date-' + (isEven ? 'even' : 'odd'));

                        if (foundTD.hasClass('time-sch-header-' + trCount + '-current-time')) {
                            td.addClass('time-sch-header-' + trCount + '-current-time');
                        }
                    }
                }
            }
        }
    };

    self.CreateCalendar = function () {
        var tr, td, header,
            minuteDiff, splits, period, end,
            thisTime, prevDate, fThisTime, fPrevDate, colspan,
            /*this is declared to avoid namespace pollution*/
            isEven,
            currentTimeIndex,
            headerCount,
            i,
            prevHeader;

        colspan = 0;

        period = self.GetSelectedPeriod();
        end = self.GetEndOfPeriod(self.Options.Start, period);

        minuteDiff = Math.abs(self.Options.Start.diff(end, 'minutes'));
        splits = (minuteDiff / period.TimeframePeriod);

        self.ContentHeaderWrap = $(document.createElement('div'))
            .addClass('time-sch-content-header-wrap')
            .appendTo(self.TableWrap);

        self.ContentWrap = $(document.createElement('div'))
            .addClass('time-sch-content-wrap')
            .appendTo(self.TableWrap);

        self.TableHeader = $(document.createElement('table'))
            .addClass('time-sch-table time-sch-table-header')
            .appendTo(self.ContentHeaderWrap);

        self.TableContent = $(document.createElement('table'))
            .addClass('time-sch-table time-sch-table-content')
            .appendTo(self.ContentWrap);

        self.SectionWrap = $(document.createElement('div'))
            .addClass('time-sch-section-wrapper')
            .appendTo(self.ContentWrap);

        if (period.Classes) {
            self.TableWrap.toggleClass(period.Classes, true);
        }

        for (headerCount = 0; headerCount < period.TimeframeHeaders.length; headerCount++) {
            prevDate = null;
            fPrevDate = null;
            isEven = true;
            colspan = 0;
            currentTimeIndex = 0;

            header = period.TimeframeHeaders[headerCount];

            tr = $(document.createElement('tr'))
                .addClass('time-sch-times time-sch-times-header-' + headerCount)
                .appendTo(self.TableHeader);

            td = $(document.createElement('td'))
                .addClass('time-sch-section time-sch-section-header')
                .appendTo(tr);

            for (i = 0; i < splits; i++) {
                thisTime = moment(self.Options.Start)
                    .tsAdd('minutes', (i * period.TimeframePeriod));

                fThisTime = thisTime.format(header);

                if (fPrevDate !== fThisTime) {
                    // If there is no prevDate, it's the Section Header
                    if (prevDate) {
                        td.attr('colspan', colspan);
                        colspan = 0;

                        if (moment() >= prevDate && moment() < thisTime) {
                            td.addClass('time-sch-header-' + headerCount + '-current-time');
                        }
                    }

                    prevDate = thisTime;
                    fPrevDate = fThisTime;

                    td = $(document.createElement('td'))
                        .data('header-row', headerCount)
                        .data('column-count', i)
                        .data('column-is-even', isEven)
                        .addClass('time-sch-date time-sch-date-header')
                        .append(fThisTime)
                        .appendTo(tr);

                    td.addClass('time-sch-header-' + headerCount + '-date-start')
                        .addClass('time-sch-header-' + headerCount + '-date-end')
                        .addClass('time-sch-header-' + headerCount + '-date-column-' + currentTimeIndex)
                        .addClass('time-sch-header-' + headerCount + '-date-' + ((currentTimeIndex % 2 === 0) ? 'even' : 'odd'));

                    for (prevHeader = 0; prevHeader < headerCount; prevHeader++) {
                        self.AddHeaderClasses(td, i, prevHeader);
                    }

                    currentTimeIndex += 1;
                }

                colspan += 1;
            }

            td.attr('colspan', colspan);
        }

        self.FillHeader();
    };

    function drawSingleSection(i, timeCount, sectionToDraw, sectionGroupId) {
        var tr, sectionContainer, td, time, icon;
        tr = $(document.createElement('tr'))
            .addClass('time-sch-section-row')
            .addClass(i % 2 === 0 ? 'time-sch-section-even' : 'time-sch-section-odd')
            .css('height', self.Options.MinRowHeight)
            .appendTo(self.TableContent);

        sectionContainer = $(document.createElement('div'))
            .addClass('time-sch-section-container')
            .css('height', self.Options.MinRowHeight)
            .data('section', sectionToDraw)
            .appendTo(self.SectionWrap);

        icon = $(document.createElement('i'));
        td = $(document.createElement('td'));
        td.addClass('time-sch-section time-sch-section-content');
        td.data('section', sectionToDraw);
        td.append(icon);
        td.append(sectionToDraw.name);
        td.appendTo(tr);
        if (sectionToDraw.isHead !== true) {
            tr.attr("sectionGroup", sectionGroupId);
            sectionContainer.attr("sectionGroup", sectionGroupId);
            for (time = 0; time < timeCount; time++) {
                td = $(document.createElement('td'))
                    .addClass('time-sch-date time-sch-date-content')
                    .appendTo(tr);
                self.AddHeaderClasses(td, time);
            }
        } else {
            icon.addClass("fa fa-sort-asc");
            tr.addClass('time-sch-section-group-head');
            if (self.Options.AllowCollapseSections) {
                tr.click(function (event) {
                    if (icon.hasClass("fa-sort-asc")) {
                        icon.removeClass("fa-sort-asc").addClass("fa fa-sort-desc");
                    } else {
                        icon.removeClass("fa-sort-desc").addClass("fa fa-sort-asc");
                    }
                    $("[sectionGroup='" + sectionGroupId + "']").toggle('slow');
                });
            }
        }
        self.Sections[sectionToDraw.id] = {
            row: tr,
            container: sectionContainer
        };
    }

    self.CreateSections = function (sections) {
        var timeCount, headers, i, tmpHeadSectionId;

        timeCount = 1;
        headers = $.makeArray(self.TableHeader.find('tr'));

        for (i = 0; i < headers.length; i++) {
            if (timeCount < $(headers[i]).find('.time-sch-date-header').length) {
                timeCount = $(headers[i]).find('.time-sch-date-header').length;
            }
        }

        for (i = 0; i < sections.length; i++) {
            if (sections[i].isHead === true) {
                tmpHeadSectionId = sections[i].id;
            }
            drawSingleSection(i, timeCount, sections[i], tmpHeadSectionId);
        }

        self.SectionWrap.css({
            left: self.Options.Element.find('.time-sch-section').outerWidth()
        });

        if (self.Options.ShowCurrentTime) {
            self.ShowCurrentTime();
        }
    };

    self.ShowCurrentTimeHandle = null;
    self.ShowCurrentTime = function () {
        var currentTime, currentTimeElem, minuteDiff, currentDiff, end;

        // Stop any other timeouts happening
        if (self.ShowCurrentTimeHandle) {
            clearTimeout(self.ShowCurrentTimeHandle);
        }

        currentTime = moment();
        end = self.GetEndOfPeriod(self.Options.Start, self.GetSelectedPeriod());
        minuteDiff = Math.abs(self.Options.Start.diff(end, 'minutes'));
        currentDiff = Math.abs(self.Options.Start.diff(currentTime, 'minutes'));

        currentTimeElem = self.Options.Element.find('.time-sch-current-time');
        currentTimeElem.remove();

        if (currentTime >= self.Options.Start && currentTime <= end) {
            currentTimeElem = $(document.createElement('div'))
                .addClass('time-sch-current-time')
                .css('left', ((currentDiff / minuteDiff) * 100) + '%')
                .attr('title', currentTime.format(self.Options.LowerFormat))
                .appendTo(self.SectionWrap);
        }

        // Since we're only comparing minutes, we may as well only check once every 30 seconds
        self.ShowCurrentTimeHandle = setTimeout(self.ShowCurrentTime, 30000);
    };

    self.CreateItems = function (items) {
        var item, event, section, itemElem, eventElem, itemContent, itemName, itemIcon,
            minuteDiff, splits, itemDiff, itemSelfDiff, eventDiff, calcTop, calcLeft, calcWidth, foundStart, foundEnd,
            inSection = {}, foundPos, elem, prevElem, needsNewRow,
            period, end, i, ev, pos, prop,
            elemTop, elemBottom, prev,
            prevElemTop, prevElemBottom;

        period = self.GetSelectedPeriod();
        end = self.GetEndOfPeriod(self.Options.Start, period);

        minuteDiff = Math.abs(self.Options.Start.diff(end, 'minutes'));

        for (i = 0; i < items.length; i++) {
            item = items[i];
            section = self.Sections[item.sectionID];

            if (section) {
                if (!inSection[item.sectionID]) {
                    inSection[item.sectionID] = [];
                }

                if (item.start <= end && item.end >= self.Options.Start) {
                    foundPos = null;

                    foundStart = moment(Math.max(item.start, self.Options.Start));
                    foundEnd = moment(Math.min(item.end, end));

                    itemDiff = foundStart.diff(self.Options.Start, 'minutes');
                    itemSelfDiff = Math.abs(foundStart.diff(foundEnd, 'minutes'));

                    calcTop = 0;
                    calcLeft = (itemDiff / minuteDiff) * 100;
                    calcWidth = (itemSelfDiff / minuteDiff) * 100;

                    itemElem = $(document.createElement('div'))
                        .addClass('time-sch-item ' + (item.classes || ''))
                        .css({
                            top: calcTop,
                            left: calcLeft + '%',
                            width: calcWidth + '%'
                        })
                        .appendTo(section.container);

                    itemContent = $(document.createElement('div'))
                        .addClass('time-sch-item-content')
                        .appendTo(itemElem);

                    if (item.name) {
                        $(document.createElement('div'))
                            .append(item.name)
                            .appendTo(itemContent);
                    }

                    if (item.events) {
                        for (ev = 0; ev < item.events.length; ev++) {
                            event = item.events[ev];

                            eventDiff = (event.at.diff(foundStart, 'minutes') / itemSelfDiff) * 100;

                            $(document.createElement('div'))
                                .addClass('time-sch-item-event ' + (event.classes || ''))
                                .css('left', eventDiff + '%')
                                .attr('title', event.at.format(self.Options.LowerFormat) + ' - ' + event.label)
                                .data('event', event)
                                .appendTo(itemElem);
                        }
                    }

                    if (item.start >= self.Options.Start) {
                        $(document.createElement('div'))
                            .addClass('time-sch-item-start')
                            .appendTo(itemElem);
                    }
                    if (item.end <= end) {
                        $(document.createElement('div'))
                            .addClass('time-sch-item-end')
                            .appendTo(itemElem);
                    }

                    item.Element = itemElem;

                    // Place this in the current section array in its sorted position
                    for (pos = 0; pos < inSection[item.sectionID].length; pos++) {
                        if (inSection[item.sectionID][pos].start > item.start) {
                            foundPos = pos;
                            break;
                        }
                    }

                    if (foundPos === null) {
                        foundPos = inSection[item.sectionID].length;
                    }

                    inSection[item.sectionID].splice(foundPos, 0, item);

                    itemElem.data('item', item);

                    self.SetupItemEvents(itemElem);
                }
            }
        }

        // Sort out layout issues so no elements overlap
        for (prop in inSection) {
            section = self.Sections[prop];

            for (i = 0; i < inSection[prop].length; i++) {
                elem = inSection[prop][i];

                // If we're passed the first item in the row
                for (prev = 0; prev < i; prev++) {
                    prevElem = inSection[prop][prev];

                    prevElemTop = prevElem.Element.position().top;
                    prevElemBottom = prevElemTop + prevElem.Element.outerHeight();

                    elemTop = elem.Element.position().top;
                    elemBottom = elemTop + elem.Element.outerHeight();

                    // (elem.start must be between prevElem.start and prevElem.end OR
                    //  elem.end must be between prevElem.start and prevElem.end) AND
                    // (elem.top must be between prevElem.top and prevElem.bottom OR
                    //  elem.bottom must be between prevElem.top and prevElem.bottom)
                    needsNewRow =
                        (
                            (prevElem.start <= elem.start && elem.start <= prevElem.end) ||
                            (prevElem.start <= elem.end && elem.end <= prevElem.end)
                        )
                        &&
                        (
                            (prevElemTop <= elemTop && elemTop <= prevElemBottom) ||
                            (prevElemTop <= elemBottom && elemBottom <= prevElemBottom)
                        );

                    if (needsNewRow) {
                        elem.Element.css('top', prevElemBottom + 1);
                    }
                }

                elemBottom = elem.Element.position().top + elem.Element.outerHeight() + 1;

                if (elemBottom > section.container.height()) {
                    section.container.css('height', elemBottom);
                    section.row.css('height', elemBottom);
                }
            }
        }
    };

    self.SetupItemEvents = function (itemElem) {

        if (self.Options.Events.ItemClicked) {
            itemElem.click(function (event) {
                event.preventDefault();
                self.Options.Events.ItemClicked.call(this, $(this).data('item'));
            });
        }

        if (self.Options.Events.ItemMouseEnter) {
            itemElem.mouseenter(function (event) {
                self.Options.Events.ItemMouseEnter.call(this, $(this).data('item'));
            });
        }

        if (self.Options.Events.ItemMouseLeave) {
            itemElem.mouseleave(function (event) {
                self.Options.Events.ItemMouseLeave.call(this, $(this).data('item'));
            });
        }

        if (self.Options.AllowDragging) {
            itemElem
                .attr('unselectable', 'on')
                .css('user-select', 'none')
                .on('selectstart', false)
                .draggable({
                    axis: self.Options.OnlyXAxis ? 'x' : '',
                    helper: 'clone',
                    zIndex: 1,
                    appendTo: self.SectionWrap,
                    distance: 5,
                    snap: '.time-sch-section-container',
                    snapMode: 'inner',
                    snapTolerance: 10,
                    drag: function (event, ui) {
                        var item, start, end, period, periodEnd, minuteDiff;
                        if (self.Options.Events.ItemMovement) {
                            period = self.GetSelectedPeriod();
                            periodEnd = self.GetEndOfPeriod(self.Options.Start, period);
                            minuteDiff = Math.abs(self.Options.Start.diff(periodEnd, 'minutes'));
                            item = $(event.target).data('item');

                            start = moment(self.Options.Start).tsAdd('minutes', minuteDiff * (ui.helper.position().left / self.SectionWrap.width()));
                            end = moment(start).tsAdd('minutes', Math.abs(item.start.diff(item.end, 'minutes')));

                            // If the start is before the start of our calendar, add the offset
                            if (item.start < self.Options.Start) {
                                start.tsAdd('minutes', item.start.diff(self.Options.Start, 'minutes'));
                                end.tsAdd('minutes', item.start.diff(self.Options.Start, 'minutes'));
                            }

                            self.Options.Events.ItemMovement.call(this, item, start, end);
                        }
                    },
                    start: function (event, ui) {
                        $(this).hide();

                        // We only want content to show, not events or resizers
                        ui.helper.children().not('.time-sch-item-content').remove();

                        if (self.Options.Events.ItemMovementStart) {
                            self.Options.Events.ItemMovementStart.call(this);
                        }
                    },
                    stop: function (event, ui) {
                        var item, start, end, period, periodEnd, minuteDiff;
                        if ($(this).length) {
                            $(this).show();
                        }
                        period = self.GetSelectedPeriod();
                        periodEnd = self.GetEndOfPeriod(self.Options.Start, period);
                        minuteDiff = Math.abs(self.Options.Start.diff(periodEnd, 'minutes'));
                        item = $(event.target).data('item');

                        start = moment(self.Options.Start).tsAdd('minutes', minuteDiff * (ui.helper.position().left / self.SectionWrap.width()));
                        end = moment(start).tsAdd('minutes', Math.abs(item.start.diff(item.end, 'minutes')));

                        if (self.Options.Events.ItemMovementEnd) {
                            self.Options.Events.ItemMovementEnd.call(this, item, start, end);
                        }
                    },
                    cancel: '.time-sch-item-end, .time-sch-item-start, .time-sch-item-event'
                });

            $('.time-sch-section-container').droppable({
                greedy: true,
                hoverClass: 'time-sch-droppable-hover',
                tolerance: 'pointer',
                drop: function (event, ui) {
                    var item, sectionID, start, end, period, periodEnd, minuteDiff;

                    period = self.GetSelectedPeriod();
                    periodEnd = self.GetEndOfPeriod(self.Options.Start, period);
                    minuteDiff = Math.abs(self.Options.Start.diff(periodEnd, 'minutes'));

                    item = ui.draggable.data('item');
                    sectionID = $(this).data('section').id;

                    start = moment(self.Options.Start).tsAdd('minutes', minuteDiff * (ui.helper.position().left / $(this).width()));
                    end = moment(start).tsAdd('minutes', Math.abs(item.start.diff(item.end, 'minutes')));

                    // If the start is before the start of our calendar, add the offset
                    if (item.start < self.Options.Start) {
                        start.tsAdd('minutes', item.start.diff(self.Options.Start, 'minutes'));
                        end.tsAdd('minutes', item.start.diff(self.Options.Start, 'minutes'));
                    }

                    // Append original to this section and reposition it while we wait
                    if (!self.Options.OnlyXAxis) {
                        ui.draggable.appendTo($(this));
                        ui.draggable.css({
                            left: ui.helper.position().left - $(this).position().left,
                            top: ui.helper.position().top - $(this).position().top
                        });
                    } else {
                        ui.draggable.css({
                            left: ui.helper.position().left - $(this).position().left
                        });
                    }

                    if (self.Options.DisableOnMove) {
                        if (ui.draggable.data('uiDraggable')) {
                            ui.draggable.draggable('disable');
                        }
                        if (ui.draggable.data('uiResizable')) {
                            ui.draggable.resizable('disable');
                        }
                    }
                    ui.draggable.show();

                    if (self.Options.Events.ItemDropped) {
                        // Time for a hack, JQueryUI throws an error if the draggable is removed in a drop
                        setTimeout(function () {
                            self.Options.Events.ItemDropped.call(this, item, sectionID, start, end);
                        }, 0);
                    }
                }
            });
        }

        if (self.Options.AllowResizing) {
            var foundHandles = null;

            if (itemElem.find('.time-sch-item-start').length && itemElem.find('.time-sch-item-end').length) {
                foundHandles = 'e, w';
            } else if (itemElem.find('.time-sch-item-start').length) {
                foundHandles = 'w';
            } else if (itemElem.find('.time-sch-item-end').length) {
                foundHandles = 'e';
            }

            if (foundHandles) {
                itemElem.resizable({
                    handles: foundHandles,
                    resize: function (event, ui) {
                        var item, start, end, period, periodEnd, minuteDiff;

                        if (self.Options.Events.ItemMovement) {
                            period = self.GetSelectedPeriod();
                            periodEnd = self.GetEndOfPeriod(self.Options.Start, period);
                            minuteDiff = Math.abs(self.Options.Start.diff(periodEnd, 'minutes'));

                            item = $(this).data('item');

                            if (ui.position.left !== ui.originalPosition.left) {
                                // Left handle moved

                                start = moment(self.Options.Start).tsAdd('minutes', minuteDiff * ($(this).position().left / self.SectionWrap.width()));
                                end = item.end;
                            } else {
                                // Right handle moved

                                start = item.start;
                                end = moment(self.Options.Start).tsAdd('minutes', minuteDiff * (($(this).position().left + $(this).width()) / self.SectionWrap.width()));
                            }

                            self.Options.Events.ItemMovement.call(this, item, start, end);
                        }
                    },
                    start: function (event, ui) {
                        // We don't want any events to show
                        $(this).find('.time-sch-item-event').hide();

                        if (self.Options.Events.ItemMovementStart) {
                            self.Options.Events.ItemMovementStart.call(this);
                        }
                    },
                    stop: function (event, ui) {
                        var item, start, end, period, periodEnd, minuteDiff, section, $this;

                        $this = $(this);

                        period = self.GetSelectedPeriod();
                        periodEnd = self.GetEndOfPeriod(self.Options.Start, period);
                        minuteDiff = Math.abs(self.Options.Start.diff(periodEnd, 'minutes'));

                        item = $this.data('item');

                        if (ui.position.left !== ui.originalPosition.left) {
                            // Left handle moved

                            start = moment(self.Options.Start).tsAdd('minutes', minuteDiff * ($this.position().left / self.SectionWrap.width()));
                            end = item.end;
                        } else {
                            // Right handle moved

                            start = item.start;
                            end = moment(self.Options.Start).tsAdd('minutes', minuteDiff * (($this.position().left + $this.width()) / self.SectionWrap.width()));
                        }

                        if (self.Options.DisableOnMove) {
                            if ($this.data('uiDraggable')) {
                                $this.draggable('disable');
                            }
                            if ($this.data('uiResizable')) {
                                $this.resizable('disable');
                            }

                            $this.find('.time-sch-item-event').show();
                        }

                        if (self.Options.Events.ItemMovementEnd) {
                            self.Options.Events.ItemMovementEnd.call(this);
                        }

                        if (self.Options.Events.ItemResized) {
                            self.Options.Events.ItemResized.call(this, item, start, end);
                        }
                    }
                });
            }
        }

        if (self.Options.Events.ItemEventClicked) {
            itemElem.find('.time-sch-item-event').click(function (event) {
                itemElem = $(this).closest('.time-sch-item');

                event.preventDefault();
                self.Options.Events.ItemEventClicked.call(this, $(this).data('event'), itemElem.data('item'));
            });
        }

        if (self.Options.Events.ItemEventMouseEnter) {
            itemElem.find('.time-sch-item-event').mouseenter(function (event) {
                itemElem = $(this).closest('.time-sch-item');

                event.preventDefault();
                self.Options.Events.ItemEventClicked.call(this, $(this).data('event'), itemElem.data('item'));
            });
        }

        if (self.Options.Events.ItemEventMouseLeave) {
            itemElem.find('.time-sch-item-event').mouseleave(function (event) {
                itemElem = $(this).closest('.time-sch-item');

                event.preventDefault();
                self.Options.Events.ItemEventClicked.call(this, $(this).data('event'), itemElem.data('item'));
            });
        }
    };

    /* Call this with "true" as override, and sections will be reloaded. Otherwise, cached sections will be used */
    self.FillSections = function (override) {
        if (!self.CachedSectionResult || override) {
            self.Options.GetSections.call(this, self.FillSections_Callback);
        } else {
            self.FillSections_Callback(self.CachedSectionResult);
        }
    };

    self.FillSections_Callback = function (obj) {
        self.CachedSectionResult = obj;

        self.CreateSections(obj);
        self.FillSchedule();
    };

    self.FillSchedule = function () {
        var period, end;

        period = self.GetSelectedPeriod();
        end = self.GetEndOfPeriod(self.Options.Start, period);

        self.Options.GetSchedule.call(this, self.FillSchedule_Callback, self.Options.Start, end);
    };

    self.FillSchedule_Callback = function (obj) {
        self.CachedScheduleResult = obj;
        self.CreateItems(obj);
    };

    self.FillHeader = function () {
        var durationString, title, periodContainer, timeContainer, periodButton, timeButton,
            selectedPeriod, end, period, i;

        periodContainer = $(document.createElement('div'))
            .addClass('time-sch-period-container');

        timeContainer = $(document.createElement('div'))
            .addClass('time-sch-time-container');

        title = $(document.createElement('div'))
            .addClass('time-sch-title');

        self.HeaderWrap
            .empty()
            .append(periodContainer, timeContainer, title);

        selectedPeriod = self.GetSelectedPeriod();
        end = self.GetEndOfPeriod(self.Options.Start, selectedPeriod);

        // Header needs a title
        // We take away 1 minute
        title.text(self.Options.Start.format(self.Options.HeaderFormat) + ' - ' + end.tsAdd('minutes', -1).format(self.Options.HeaderFormat));

        for (i = 0; i < self.Options.Periods.length; i++) {
            period = self.Options.Periods[i];

            $(document.createElement('a'))
                .addClass('time-sch-period-button time-sch-button')
                .addClass(period.Name === selectedPeriod.Name ? 'time-sch-selected-button' : '')
                .attr('href', '#')
                .append(period.Label)
                .data('period', period)
                .click(self.Period_Clicked)
                .appendTo(periodContainer);
        }

        if (self.Options.ShowGoto) {
            $(document.createElement('a'))
                .addClass('time-sch-time-button time-sch-time-button-goto time-sch-button')
                .attr({
                    href: '#',
                    title: self.Options.Text.GotoButtonTitle
                })
                .append(self.Options.Text.GotoButton)
                .click(self.GotoTimeShift_Clicked)
                .appendTo(timeContainer);
        }

        if (self.Options.ShowToday) {
            $(document.createElement('a'))
                .addClass('time-sch-time-button time-sch-time-button-today time-sch-button')
                .attr({
                    href: '#',
                    title: self.Options.Text.TodayButtonTitle
                })
                .append(self.Options.Text.TodayButton)
                .click(self.TimeShift_Clicked)
                .appendTo(timeContainer);
        }

        $(document.createElement('a'))
            .addClass('time-sch-time-button time-sch-time-button-prev time-sch-button')
            .attr({
                href: '#',
                title: self.Options.Text.PrevButtonTitle
            })
            .append(self.Options.Text.PrevButton)
            .click(self.TimeShift_Clicked)
            .appendTo(timeContainer);

        $(document.createElement('a'))
            .addClass('time-sch-time-button time-sch-time-button-next time-sch-button')
            .attr({
                href: '#',
                title: self.Options.Text.NextButtonTitle
            })
            .append(self.Options.Text.NextButton)
            .click(self.TimeShift_Clicked)
            .appendTo(timeContainer);
    };

    self.GotoTimeShift_Clicked = function (event) {
        event.preventDefault();

        $(document.createElement('input'))
            .attr('type', 'text')
            .css({
                position: 'absolute',
                left: 0,
                bottom: 0
            })
            .appendTo($(this))
            .datepicker({
                onClose: function () {
                    $(this).remove();
                },
                onSelect: function (date) {
                    self.Options.Start = moment(date);
                    self.Init();
                },
                defaultDate: self.Options.Start.toDate()
            })
            .datepicker('show')
            .hide();
    };

    self.TimeShift_Clicked = function (event) {
        var period;

        event.preventDefault();
        period = self.GetSelectedPeriod();

        if ($(this).is('.time-sch-time-button-today')) {
            self.Options.Start = moment().startOf('day');
        } else if ($(this).is('.time-sch-time-button-prev')) {
            self.Options.Start.tsAdd('minutes', period.TimeframeOverall * -1);
        } else if ($(this).is('.time-sch-time-button-next')) {
            self.Options.Start.tsAdd('minutes', period.TimeframeOverall);
        }

        self.Init();
    };

    /* Selects the period with the given name */
    self.SelectPeriod = function (name) {
        self.Options.SelectedPeriod = name;
        self.Init();
    };

    self.Period_Clicked = function (event) {
        event.preventDefault();
        self.SelectPeriod($(this).data('period').Name);
    };
};