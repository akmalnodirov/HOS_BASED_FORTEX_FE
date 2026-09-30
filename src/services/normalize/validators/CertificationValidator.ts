import dayjs, { Dayjs } from 'dayjs';
import { EldEvent, IEventValidator } from '@/types/events';
import { addErrorMessage } from '../utils/messageHandler';
import { useTimeZoneHelper, formatTime } from '@/helpers/timezone';
import { generateDateRange, convertToTimeStamp } from '../utils/dateUtils';
import { EVENT_PREFIXES, isCertificationEvent, getCertificationNumber } from '../utils/eventUtils';

const { acceptAsTimeZone, getStartOf, getEndOf, formatToUTC } = useTimeZoneHelper();

/**
 * Certification validator
 * Validates certification events for correct order, missing events, and date issues
 * 
 * Single Responsibility: Only validates certification events
 */
export class CertificationValidator implements IEventValidator {
  private readonly CERT_EVENT_PREFIX = EVENT_PREFIXES.CERTIFICATION;

  /**
   * Validate certification events
   * @param events - Array of events to validate
   */
  validate(events: EldEvent[]): void {
    const certEvents = this.getCertificationEvents(events);
    this.sortCertificationEvents(certEvents);
    
    // Check for missing certification events
    this.validateMissingCertifications(events, certEvents);
    
    // Check certification order and dates
    this.validateCertificationOrder(certEvents);
  }

  /**
   * Filter and return only certification events
   */
  private getCertificationEvents(events: EldEvent[]): EldEvent[] {
    return events.filter((event) => isCertificationEvent(event));
  }

  /**
   * Sort certification events by certified date and number
   */
  private sortCertificationEvents(certEvents: EldEvent[]): void {
    certEvents.sort((a, b) => {
      // If dates are invalid, sort by certification number
      if (!this.isValidDate(a.certifiedDate) || !this.isValidDate(b.certifiedDate)) {
        return getCertificationNumber(a.eventCodeDescription) - getCertificationNumber(b.eventCodeDescription);
      }

      const dateA = getStartOf(acceptAsTimeZone(a.certifiedDate!));
      const dateB = getStartOf(acceptAsTimeZone(b.certifiedDate!));

      if (dateA.isBefore(dateB)) return -1;
      if (dateA.isAfter(dateB)) return 1;

      // If same date, sort by certification number
      return getCertificationNumber(a.eventCodeDescription) - getCertificationNumber(b.eventCodeDescription);
    });
  }

  /**
   * Check if date is valid
   */
  private isValidDate(date: string | Dayjs | undefined): boolean {
    return !!(date && dayjs(date).isValid());
  }

  /**
   * Validate certification order and dates
   */
  private validateCertificationOrder(certEvents: EldEvent[]): void {
    let errorCount = 0;

    certEvents.forEach((currentEvent, index) => {
      const currentCertNumber = getCertificationNumber(currentEvent.eventCodeDescription);
      const currentCertDate = getStartOf(acceptAsTimeZone(currentEvent.certifiedDate!));
      const startDateFormatted = acceptAsTimeZone(currentEvent.dateTime);
      const certDateFormatted = acceptAsTimeZone(currentEvent.certifiedDate!);

      if (index > 0) {
        const previousEvent = certEvents[index - 1];
        const previousCertNumber = getCertificationNumber(previousEvent.eventCodeDescription);
        const previousCertDate = getStartOf(acceptAsTimeZone(previousEvent.certifiedDate!));

        if (currentCertDate.isSame(previousCertDate)) {
          // Same date - check order
          this.validateSameDateOrder(currentEvent, currentCertNumber, previousCertNumber);
        } else {
          // New date - must start with DR_CERT_1
          this.validateNewDateOrder(currentEvent, currentCertNumber);
        }
      } else {
        // First cert event must be DR_CERT_1
        this.validateFirstCertification(currentEvent, currentCertNumber);
      }

      // Check certification date validity
      if (startDateFormatted.isBefore(certDateFormatted, 'day') || 
          currentEvent?.errorTitles?.includes('Incorrect Certification Date')) {
        addErrorMessage(currentEvent, 'Incorrect Certification Date');
        errorCount++;
      }
    });

    console.log('Certification error count:', errorCount);
  }

  /**
   * Validate certification order on the same date
   */
  private validateSameDateOrder(event: EldEvent, currentNumber: number, previousNumber: number): void {
    if (currentNumber < previousNumber) {
      addErrorMessage(event, 'Incorrect Certification Order');
    } else if (currentNumber === previousNumber) {
      addErrorMessage(event, 'Duplicate Certification Orders');
    } else if (currentNumber - previousNumber > 1) {
      addErrorMessage(event, 'Certification Order Missing');
    }
  }

  /**
   * Validate certification order on a new date
   */
  private validateNewDateOrder(event: EldEvent, certNumber: number): void {
    if (certNumber !== 1) {
      addErrorMessage(event, 'Incorrect Certification Order', 'Certification Order Missing');
    }
  }

  /**
   * Validate first certification event
   */
  private validateFirstCertification(event: EldEvent, certNumber: number): void {
    if (certNumber !== 1) {
      addErrorMessage(event, 'Incorrect Certification Order', 'Certification Order Missing');
    }
  }

  /**
   * Validate missing certification events
   */
  private validateMissingCertifications(events: EldEvent[], certEvents: EldEvent[]): void {
    const { minMoment, maxMoment } = this.getDateRange(events);
    
    if (!minMoment || !maxMoment) {
      return;
    }

    const allDates = generateDateRange(
      minMoment.format('YYYY-MM-DD'),
      maxMoment.format('YYYY-MM-DD')
    );

    const eventsMap = this.buildMissingCertificationMap(events, allDates);
    this.applyMissingCertificationErrors(events, eventsMap);
  }

  /**
   * Get min and max date range from events
   */
  private getDateRange(events: EldEvent[]): { minMoment: Dayjs | null; maxMoment: Dayjs | null } {
    let minMoment: Dayjs | null = null;
    let maxMoment: Dayjs | null = null;

    events.forEach((ev) => {
      const m = getStartOf(acceptAsTimeZone(ev.dateTime));

      if (!minMoment || m.isBefore(minMoment)) {
        minMoment = m.clone();
      }
      if (!maxMoment || m.isAfter(maxMoment)) {
        maxMoment = m.clone();
      }
    });

    return { minMoment, maxMoment };
  }

  /**
   * Build map of missing certification events
   */
  private buildMissingCertificationMap(events: EldEvent[], allDates: string[]): Record<string, string[]> {
    const eventsIndByCertifiedDate = new Map<string, number>();
    const uniqEventsByDate: EldEvent[] = [];
    
    events.forEach((ev, ind) => {
      const key = convertToTimeStamp(ev.certifiedDate);
      if (!eventsIndByCertifiedDate.has(key)) {
        eventsIndByCertifiedDate.set(key, ind);
        uniqEventsByDate.push(ev);
      }
    });

    const uniqEventsByDateSet = new Set(uniqEventsByDate.map(ev => convertToTimeStamp(ev.certifiedDate)));
    const nonCertItems = events.filter((ev) => !isCertificationEvent(ev)).reverse();
    const eventsMap: Record<string, string[]> = {};

    allDates.forEach((date) => {
      const formattedEndDate = formatToUTC(getEndOf(acceptAsTimeZone(date)));

      while (nonCertItems.length > 0 && 
             convertToTimeStamp(date) <= convertToTimeStamp(nonCertItems.at(-1)!.dateTime)) {
        nonCertItems.pop();
      }

      if (uniqEventsByDateSet.has(convertToTimeStamp(date))) {
        const event = nonCertItems?.at(-1) ?? null;
        if (event) {
          if (eventsMap[event.dateTime as string]) {
            eventsMap[event.dateTime as string].push(date);
          } else {
            eventsMap[event.dateTime as string] = [date];
          }
        }
      }
    });

    return eventsMap;
  }

  /**
   * Apply missing certification errors to events
   */
  private applyMissingCertificationErrors(events: EldEvent[], eventsMap: Record<string, string[]>): void {
    if (Object.keys(eventsMap).length === 0) {
      return;
    }

    const eventsGroupMapByDate = new Map<string, EldEvent[]>();
    events.forEach(ev => {
      const key = convertToTimeStamp(ev.dateTime);
      const prevList = eventsGroupMapByDate.get(key) ?? [];
      prevList.push(ev);
      eventsGroupMapByDate.set(key, prevList);
    });

    Object.keys(eventsMap).forEach((startDate) => {
      const key = convertToTimeStamp(startDate);
      const list = eventsGroupMapByDate.get(key) ?? [];
      const missingDates = eventsMap[startDate]
        .map((date) => formatTime(date, 'MM-DD-YYYY'))
        .join(', ');
      
      list.forEach(ev => {
        addErrorMessage(ev, `Certification event for this dates (${missingDates}) is missing`);
      });
    });
  }
}

// Export singleton instance
export const certificationValidator = new CertificationValidator();
