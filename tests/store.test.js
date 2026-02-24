import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadModule } from './setup.js';

describe('App.Store', () => {
  beforeEach(() => {
    // Load utils first (Store depends on App.Utils.deepClone)
    loadModule('src/js/utils.js');
    // Then load store
    loadModule('src/js/store.js');
  });

  describe('get() - returns project state', () => {
    it('returns the default project object', () => {
      const project = App.Store.get();
      expect(project).toBeDefined();
      expect(project.meta).toBeDefined();
      expect(project.meta.title).toBe('Yeni Proje');
    });

    it('has default categories', () => {
      const project = App.Store.get();
      expect(project.categories).toBeDefined();
      expect(project.categories.operasyon).toBeDefined();
      expect(project.categories.operasyon.label).toBe('Operasyon');
    });

    it('has empty arrays for episodes, scenes, events, connections', () => {
      const project = App.Store.get();
      expect(project.episodes).toEqual([]);
      expect(project.scenes).toEqual([]);
      expect(project.events).toEqual([]);
      expect(project.connections).toEqual([]);
    });
  });

  describe('set() - replaces state', () => {
    it('replaces the entire project', () => {
      const newProject = {
        meta: { title: 'Test Project', author: 'Tester', settings: { episodeDuration: 3600, pixelsPerSecond: 1, snapGrid: 5 } },
        categories: {},
        characters: [],
        episodes: [],
        scenes: [],
        events: [],
        connections: []
      };
      App.Store.set(newProject);
      expect(App.Store.get().meta.title).toBe('Test Project');
    });

    it('emits change event on set', () => {
      const spy = vi.fn();
      App.Store.on('change', spy);
      App.Store.set({
        meta: { title: 'X', author: '', settings: { episodeDuration: 2700, pixelsPerSecond: 0.5, snapGrid: 10 } },
        categories: {},
        characters: [],
        episodes: [],
        scenes: [],
        events: [],
        connections: []
      });
      expect(spy).toHaveBeenCalledWith({ type: 'set' });
    });
  });

  describe('snapshot() and undo()/redo()', () => {
    it('undo restores previous state', () => {
      const project = App.Store.get();
      expect(project.meta.title).toBe('Yeni Proje');

      // Take snapshot, then change state
      App.Store.snapshot();
      project.meta.title = 'Changed';

      // Undo should restore
      App.Store.undo();
      expect(App.Store.get().meta.title).toBe('Yeni Proje');
    });

    it('redo restores undone state', () => {
      const project = App.Store.get();

      // Snapshot original, mutate, snapshot again, mutate again
      App.Store.snapshot();
      project.meta.title = 'Version 2';

      // Undo back to original
      App.Store.undo();
      expect(App.Store.get().meta.title).toBe('Yeni Proje');

      // Redo forward to Version 2
      App.Store.redo();
      expect(App.Store.get().meta.title).toBe('Version 2');
    });

    it('undo does nothing when stack is empty', () => {
      const titleBefore = App.Store.get().meta.title;
      App.Store.undo();
      expect(App.Store.get().meta.title).toBe(titleBefore);
    });

    it('redo does nothing when stack is empty', () => {
      const titleBefore = App.Store.get().meta.title;
      App.Store.redo();
      expect(App.Store.get().meta.title).toBe(titleBefore);
    });

    it('snapshot clears redo stack', () => {
      App.Store.snapshot();
      App.Store.get().meta.title = 'V2';
      App.Store.undo();

      // Now take a new snapshot - redo should be cleared
      App.Store.snapshot();
      App.Store.get().meta.title = 'V3';

      App.Store.redo();
      // redo stack was cleared, so title should still be V3
      expect(App.Store.get().meta.title).toBe('V3');
    });

    it('undo emits change event with type undo', () => {
      const spy = vi.fn();
      App.Store.on('change', spy);
      App.Store.snapshot();
      App.Store.undo();
      expect(spy).toHaveBeenCalledWith({ type: 'undo' });
    });

    it('redo emits change event with type redo', () => {
      const spy = vi.fn();
      App.Store.snapshot();
      App.Store.get().meta.title = 'changed';
      App.Store.undo();

      App.Store.on('change', spy);
      App.Store.redo();
      expect(spy).toHaveBeenCalledWith({ type: 'redo' });
    });
  });

  describe('on()/emit() - event system', () => {
    it('registers and triggers a listener', () => {
      const spy = vi.fn();
      App.Store.on('custom', spy);
      App.Store.emit('custom', { foo: 'bar' });
      expect(spy).toHaveBeenCalledWith({ foo: 'bar' });
    });

    it('supports multiple listeners on same event', () => {
      const spy1 = vi.fn();
      const spy2 = vi.fn();
      App.Store.on('evt', spy1);
      App.Store.on('evt', spy2);
      App.Store.emit('evt', 'data');
      expect(spy1).toHaveBeenCalledWith('data');
      expect(spy2).toHaveBeenCalledWith('data');
    });

    it('does not error when emitting event with no listeners', () => {
      expect(() => App.Store.emit('nonexistent', {})).not.toThrow();
    });
  });

  describe('getPPS/getEPDUR/getEPPX/getSnap/setSnap', () => {
    it('getPPS returns default pixels per second', () => {
      expect(App.Store.getPPS()).toBe(0.5);
    });

    it('getEPDUR returns default episode duration', () => {
      expect(App.Store.getEPDUR()).toBe(2700);
    });

    it('getEPPX returns duration * pps', () => {
      expect(App.Store.getEPPX()).toBe(2700 * 0.5);
    });

    it('getSnap returns default snap grid', () => {
      expect(App.Store.getSnap()).toBe(10);
    });

    it('setSnap updates snap grid value', () => {
      App.Store.setSnap(5);
      expect(App.Store.getSnap()).toBe(5);
    });
  });

  describe('Episode helpers', () => {
    it('addEpisode adds and sorts by order', () => {
      App.Store.addEpisode({ id: 'ep2', order: 2, title: 'Episode 2' });
      App.Store.addEpisode({ id: 'ep1', order: 1, title: 'Episode 1' });
      const ids = App.Store.getEpisodeIds();
      expect(ids).toEqual(['ep1', 'ep2']);
    });

    it('getEpisode finds episode by id', () => {
      App.Store.addEpisode({ id: 'ep1', order: 1, title: 'Test' });
      expect(App.Store.getEpisode('ep1').title).toBe('Test');
    });

    it('updateEpisode modifies episode data', () => {
      App.Store.addEpisode({ id: 'ep1', order: 1, title: 'Old' });
      App.Store.updateEpisode('ep1', { title: 'New' });
      expect(App.Store.getEpisode('ep1').title).toBe('New');
    });

    it('removeEpisode removes episode and related scenes/events', () => {
      App.Store.addEpisode({ id: 'ep1', order: 1, title: 'Ep' });
      App.Store.get().scenes.push({ id: 's1', episodeId: 'ep1' });
      App.Store.get().events.push({ id: 'e1', episodeId: 'ep1' });
      App.Store.removeEpisode('ep1');
      expect(App.Store.getEpisode('ep1')).toBeUndefined();
      expect(App.Store.get().scenes.length).toBe(0);
      expect(App.Store.get().events.length).toBe(0);
    });
  });

  describe('Scene helpers', () => {
    it('addScene adds a scene', () => {
      App.Store.addScene({ id: 's1', episodeId: 'ep1', order: 1, title: 'Scene 1' });
      expect(App.Store.getScene('s1')).toBeDefined();
    });

    it('getScenes filters by episode and sorts by order', () => {
      App.Store.addScene({ id: 's2', episodeId: 'ep1', order: 2, title: 'S2' });
      App.Store.addScene({ id: 's1', episodeId: 'ep1', order: 1, title: 'S1' });
      App.Store.addScene({ id: 's3', episodeId: 'ep2', order: 1, title: 'S3' });
      const scenes = App.Store.getScenes('ep1');
      expect(scenes.length).toBe(2);
      expect(scenes[0].id).toBe('s1');
    });

    it('removeScene removes scene and related events', () => {
      App.Store.addScene({ id: 's1', episodeId: 'ep1', order: 1, title: 'S1' });
      App.Store.get().events.push({ id: 'e1', sceneId: 's1', episodeId: 'ep1' });
      App.Store.removeScene('s1');
      expect(App.Store.getScene('s1')).toBeUndefined();
      expect(App.Store.get().events.length).toBe(0);
    });
  });

  describe('Event helpers', () => {
    it('addEvent adds an event', () => {
      App.Store.addEvent({ id: 'e1', episodeId: 'ep1', title: 'Event 1' });
      expect(App.Store.getEvent('e1')).toBeDefined();
    });

    it('getEvents filters by episode', () => {
      App.Store.addEvent({ id: 'e1', episodeId: 'ep1', title: 'E1' });
      App.Store.addEvent({ id: 'e2', episodeId: 'ep2', title: 'E2' });
      expect(App.Store.getEvents('ep1').length).toBe(1);
    });

    it('getEvents returns all events when no epId given', () => {
      App.Store.addEvent({ id: 'e1', episodeId: 'ep1', title: 'E1' });
      App.Store.addEvent({ id: 'e2', episodeId: 'ep2', title: 'E2' });
      expect(App.Store.getEvents().length).toBe(2);
    });

    it('removeEvent removes event and related connections', () => {
      App.Store.addEvent({ id: 'e1', episodeId: 'ep1', title: 'E1' });
      App.Store.get().connections.push({ from: 'e1', to: 'e2', type: 'causal' });
      App.Store.removeEvent('e1');
      expect(App.Store.getEvent('e1')).toBeUndefined();
      expect(App.Store.get().connections.length).toBe(0);
    });
  });

  describe('Connection helpers', () => {
    it('addConnection adds a connection', () => {
      App.Store.addConnection({ from: 'e1', to: 'e2', type: 'causal' });
      expect(App.Store.getConnections().length).toBe(1);
    });

    it('addConnection prevents duplicates', () => {
      App.Store.addConnection({ from: 'e1', to: 'e2', type: 'causal' });
      App.Store.addConnection({ from: 'e1', to: 'e2', type: 'causal' });
      expect(App.Store.getConnections().length).toBe(1);
    });

    it('removeConnection removes matching connection', () => {
      App.Store.addConnection({ from: 'e1', to: 'e2', type: 'causal' });
      App.Store.removeConnection('e1', 'e2', 'causal');
      expect(App.Store.getConnections().length).toBe(0);
    });

    it('getConnections filters by event id', () => {
      App.Store.addConnection({ from: 'e1', to: 'e2', type: 'causal' });
      App.Store.addConnection({ from: 'e3', to: 'e4', type: 'causal' });
      expect(App.Store.getConnections('e1').length).toBe(1);
    });
  });

  describe('Character helpers', () => {
    it('addCharacter adds a character', () => {
      App.Store.addCharacter({ id: 'c1', name: 'Ali' });
      expect(App.Store.getCharacters().length).toBe(1);
    });

    it('removeCharacter removes a character', () => {
      App.Store.addCharacter({ id: 'c1', name: 'Ali' });
      App.Store.removeCharacter('c1');
      expect(App.Store.getCharacters().length).toBe(0);
    });
  });

  describe('Category helpers', () => {
    it('addCategory adds a new category', () => {
      App.Store.addCategory('custom', { label: 'Custom', color: '#123456' });
      expect(App.Store.getCategories().custom).toBeDefined();
      expect(App.Store.getCategories().custom.label).toBe('Custom');
    });

    it('removeCategory removes a category', () => {
      App.Store.addCategory('temp', { label: 'Temp', color: '#000' });
      App.Store.removeCategory('temp');
      expect(App.Store.getCategories().temp).toBeUndefined();
    });
  });

  describe('batch()', () => {
    it('takes a single snapshot for multiple operations', () => {
      App.Store.batch(() => {
        App.Store.get().episodes.push({ id: 'ep1', order: 1 });
        App.Store.get().episodes.push({ id: 'ep2', order: 2 });
      });
      // Undo should revert both additions at once
      App.Store.undo();
      expect(App.Store.get().episodes.length).toBe(0);
    });

    it('emits change with type batch', () => {
      const spy = vi.fn();
      App.Store.on('change', spy);
      App.Store.batch(() => {});
      expect(spy).toHaveBeenCalledWith({ type: 'batch' });
    });
  });
});
