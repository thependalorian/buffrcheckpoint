package com.buffrcheckpoint.kiosk.roster

import com.buffrcheckpoint.kiosk.core.db.RosterCacheDao
import com.buffrcheckpoint.kiosk.core.db.RosterCacheEntity
import com.buffrcheckpoint.kiosk.core.domain.RosterEntry
import com.buffrcheckpoint.kiosk.core.network.ApiServiceProvider
import com.buffrcheckpoint.kiosk.core.network.dto.VisitRosterRowDto
import java.time.Instant
import javax.inject.Inject
import javax.inject.Singleton

sealed interface RosterResult {
    data class Success(val entries: List<RosterEntry>, val fromCache: Boolean = false) : RosterResult
    data class Failure(val message: String) : RosterResult
}

@Singleton
class RosterRepository @Inject constructor(
    private val apiServiceProvider: ApiServiceProvider,
    private val rosterCacheDao: RosterCacheDao,
) {
    suspend fun openRoster(siteId: String): RosterResult = try {
        val rows = apiServiceProvider.get().roster(siteId = siteId)
        val now = System.currentTimeMillis()
        rosterCacheDao.replaceSite(
            siteId,
            rows.map { it.toCacheEntity(now) },
        )
        RosterResult.Success(rows.map { it.toDomain() }, fromCache = false)
    } catch (e: retrofit2.HttpException) {
        val cached = rosterCacheDao.forSite(siteId).map { it.toDomain() }
        if (cached.isNotEmpty()) {
            RosterResult.Success(cached, fromCache = true)
        } else {
            RosterResult.Failure("Couldn't load the roster (HTTP ${e.code()}).")
        }
    } catch (e: java.io.IOException) {
        val cached = rosterCacheDao.forSite(siteId).map { it.toDomain() }
        if (cached.isNotEmpty()) {
            RosterResult.Success(cached, fromCache = true)
        } else {
            RosterResult.Failure("No connection and no cached roster for this site.")
        }
    }
}

private fun VisitRosterRowDto.toDomain(): RosterEntry = RosterEntry(
    visitId = visitId,
    siteId = siteId,
    visitorDisplayName = visitorDisplayName,
    visitorTypeCode = visitorTypeCode,
    hostDisplayName = hostDisplayName,
    assuranceLevelCode = assuranceLevelCode,
    visitStatusCode = visitStatusCode,
    checkedInAt = checkedInAt?.let { Instant.parse(it) },
    checkedOutAt = checkedOutAt?.let { Instant.parse(it) },
    offlineCaptured = offlineCaptured,
    requiresAction = requiresAction,
)

private fun VisitRosterRowDto.toCacheEntity(now: Long): RosterCacheEntity = RosterCacheEntity(
    visitId = visitId,
    siteId = siteId,
    visitorDisplayName = visitorDisplayName,
    visitorTypeCode = visitorTypeCode,
    hostDisplayName = hostDisplayName,
    assuranceLevelCode = assuranceLevelCode,
    visitStatusCode = visitStatusCode,
    checkedInAt = checkedInAt,
    checkedOutAt = checkedOutAt,
    offlineCaptured = offlineCaptured,
    requiresAction = requiresAction,
    cachedAtEpochMs = now,
)

private fun RosterCacheEntity.toDomain(): RosterEntry = RosterEntry(
    visitId = visitId,
    siteId = siteId,
    visitorDisplayName = visitorDisplayName,
    visitorTypeCode = visitorTypeCode,
    hostDisplayName = hostDisplayName,
    assuranceLevelCode = assuranceLevelCode,
    visitStatusCode = visitStatusCode,
    checkedInAt = checkedInAt?.let { Instant.parse(it) },
    checkedOutAt = checkedOutAt?.let { Instant.parse(it) },
    offlineCaptured = offlineCaptured,
    requiresAction = requiresAction,
)
