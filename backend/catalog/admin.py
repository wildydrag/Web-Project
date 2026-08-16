from django.contrib import admin

from .models import Album, AlbumArtist, Song, SongArtist


class AlbumArtistInline(admin.TabularInline):
    model = AlbumArtist
    extra = 1


class SongArtistInline(admin.TabularInline):
    model = SongArtist
    extra = 1


@admin.register(Album)
class AlbumAdmin(admin.ModelAdmin):
    list_display = ("title", "genre", "type", "release_date", "early_access")
    list_filter = ("genre", "type", "early_access")
    search_fields = ("title",)
    inlines = [AlbumArtistInline]


@admin.register(Song)
class SongAdmin(admin.ModelAdmin):
    list_display = ("title", "album", "genre", "release_date", "stream_count", "early_access")
    list_filter = ("genre", "early_access")
    search_fields = ("title",)
    inlines = [SongArtistInline]
