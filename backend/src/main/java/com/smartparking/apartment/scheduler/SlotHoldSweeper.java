package com.smartparking.apartment.scheduler;

import com.smartparking.apartment.entity.Slot;
import com.smartparking.apartment.repository.SlotRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

/**
 * Belt-and-braces expiry: SlotServiceImpl already releases stale holds
 * lazily on every read, but that only happens when someone is actively
 * polling. This sweep guarantees a held bay comes back to AVAILABLE within
 * app.slot.hold-minutes even if every browser tab is closed.
 */
@Component
public class SlotHoldSweeper {

    private static final Logger log = LoggerFactory.getLogger(SlotHoldSweeper.class);

    @Autowired
    private SlotRepository slotRepository;

    @Value("${app.slot.hold-minutes:3}")
    private long holdMinutes;

    @Scheduled(fixedRate = 20_000)
    @Transactional
    public void expireStaleHolds() {
        int released = slotRepository.releaseExpiredHolds(
                Slot.Status.HELD, Slot.Status.AVAILABLE, LocalDateTime.now().minusMinutes(holdMinutes));
        if (released > 0) {
            log.info("Released {} expired slot hold(s)", released);
        }
    }
}