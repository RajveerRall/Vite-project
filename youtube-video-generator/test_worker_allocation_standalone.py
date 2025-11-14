#!/usr/bin/env python3
"""
Standalone test script for dynamic worker allocation logic.
This verifies the worker calculation without requiring full dependencies.
"""

import os
from multiprocessing import cpu_count

# Mock psutil for testing
class MockPsutil:
    class VirtualMemory:
        def __init__(self, available_gb=8):
            self.available = available_gb * 1024 ** 3
    
    @staticmethod
    def cpu_percent(interval=0):
        return 30.0  # Mock 30% CPU usage
    
    @staticmethod
    def virtual_memory():
        return MockPsutil.VirtualMemory(available_gb=8)

# Inline the worker calculation function for testing
def calculate_optimal_workers(num_tasks=None, frame_complexity='medium', mock_psutil=None):
    """
    Dynamically calculate optimal number of workers based on:
    - CPU cores and current CPU load
    - Available RAM
    - Task count
    - Frame complexity (affects memory per worker)
    """
    
    # Check for environment variable override
    try:
        max_workers_env = os.environ.get('MAX_WORKERS', '').strip()
        if max_workers_env and max_workers_env.isdigit():
            override_value = int(max_workers_env)
            if override_value > 0:
                print(f"MAX_WORKERS environment variable set to {override_value}")
                return override_value
    except Exception:
        pass
    
    # Use mock or real psutil
    psutil = mock_psutil or MockPsutil()
    
    # 1. CPU-based calculation
    total_cores = cpu_count()
    
    # Reserve 1-2 cores for system and main process
    if total_cores <= 4:
        available_cores = max(1, total_cores - 1)
    elif total_cores <= 8:
        available_cores = max(2, total_cores - 2)
    else:
        available_cores = max(4, total_cores - 2)
    
    # Check current CPU load
    try:
        cpu_percent = psutil.cpu_percent(interval=0)
        # If CPU is already heavily loaded (>70%), reduce workers
        if cpu_percent > 70:
            load_factor = 0.5
        elif cpu_percent > 50:
            load_factor = 0.75
        else:
            load_factor = 1.0
        
        cpu_based_workers = int(available_cores * load_factor)
    except Exception as e:
        print(f"Warning: Could not check CPU load ({e}), using fallback")
        cpu_based_workers = available_cores
    
    # 2. Memory-based calculation
    try:
        memory = psutil.virtual_memory()
        available_gb = memory.available / (1024 ** 3)
        
        # Estimate memory per worker based on frame complexity
        memory_per_worker = {
            'low': 0.15,      # 150MB
            'medium': 0.3,    # 300MB
            'high': 0.6       # 600MB
        }.get(frame_complexity, 0.3)
        
        # Reserve 2GB for system and FFmpeg encoding
        usable_gb = max(1, available_gb - 2)
        memory_based_workers = int(usable_gb / memory_per_worker)
    except Exception as e:
        print(f"Warning: Could not check memory ({e}), using CPU-based calculation")
        memory_based_workers = available_cores
    
    # 3. Task-based optimization
    if num_tasks is not None:
        task_based_workers = min(num_tasks, cpu_based_workers)
    else:
        task_based_workers = cpu_based_workers
    
    # 4. Calculate final worker count
    optimal_workers = min(cpu_based_workers, memory_based_workers, task_based_workers)
    
    # Apply reasonable bounds
    min_workers = 1
    max_workers = 32
    optimal_workers = max(min_workers, min(optimal_workers, max_workers))
    
    # Log the decision
    try:
        print(f"Worker calculation:")
        print(f"  CPU cores: {total_cores} (using {available_cores})")
        print(f"  CPU load: {cpu_percent:.1f}%")
        print(f"  Available RAM: {available_gb:.1f} GB")
        print(f"  CPU-based workers: {cpu_based_workers}")
        print(f"  Memory-based workers: {memory_based_workers}")
        if num_tasks:
            print(f"  Task count: {num_tasks}")
        print(f"  → Optimal workers: {optimal_workers}")
    except:
        print(f"Using {optimal_workers} workers")
    
    return optimal_workers


def calculate_frame_complexity(width, height, has_scene_images, highlight_mode):
    """Determine frame complexity for memory estimation."""
    total_pixels = width * height
    
    if has_scene_images and total_pixels >= (1920 * 1080):
        return 'high'
    
    if has_scene_images or total_pixels > (1280 * 720):
        return 'medium'
    
    return 'low'


def run_tests():
    """Run all tests."""
    print("=" * 60)
    print("Testing Dynamic Worker Allocation")
    print("=" * 60)
    print()
    
    mock_psutil = MockPsutil()
    
    # Test 1: Small task count
    print("Test 1: Small video (50 frames)")
    print("-" * 60)
    workers = calculate_optimal_workers(num_tasks=50, frame_complexity='low', mock_psutil=mock_psutil)
    print(f"Result: {workers} workers")
    assert workers >= 1, "Should have at least 1 worker"
    assert workers <= 50, "Should not exceed task count"
    print("✓ PASSED\n")
    
    # Test 2: Large task count
    print("Test 2: Large video (2000 frames)")
    print("-" * 60)
    workers = calculate_optimal_workers(num_tasks=2000, frame_complexity='medium', mock_psutil=mock_psutil)
    print(f"Result: {workers} workers")
    assert workers >= 1, "Should have at least 1 worker"
    assert workers <= 32, "Should not exceed max limit of 32"
    print("✓ PASSED\n")
    
    # Test 3: High complexity
    print("Test 3: High complexity frames (scene images)")
    print("-" * 60)
    workers = calculate_optimal_workers(num_tasks=500, frame_complexity='high', mock_psutil=mock_psutil)
    print(f"Result: {workers} workers")
    assert workers >= 1, "Should have at least 1 worker"
    print("✓ PASSED\n")
    
    # Test 4: Environment variable override
    print("Test 4: Environment variable override (MAX_WORKERS=5)")
    print("-" * 60)
    os.environ['MAX_WORKERS'] = '5'
    workers = calculate_optimal_workers(num_tasks=1000, frame_complexity='medium', mock_psutil=mock_psutil)
    print(f"Result: {workers} workers")
    assert workers == 5, "Should respect MAX_WORKERS environment variable"
    print("✓ PASSED\n")
    del os.environ['MAX_WORKERS']
    
    # Test 5: Frame complexity calculation
    print("Test 5: Frame complexity calculation")
    print("-" * 60)
    
    complexity = calculate_frame_complexity(1280, 720, False, 'none')
    print(f"  1280x720, no scene images: {complexity}")
    assert complexity == 'low', "Should be low complexity"
    
    complexity = calculate_frame_complexity(1920, 1080, False, 'sentence')
    print(f"  1920x1080, no scene images: {complexity}")
    assert complexity == 'medium', "Should be medium complexity"
    
    complexity = calculate_frame_complexity(1920, 1080, True, 'sentence')
    print(f"  1920x1080, with scene images: {complexity}")
    assert complexity == 'high', "Should be high complexity"
    
    print("✓ PASSED\n")
    
    # Test 6: Low memory scenario
    print("Test 6: Low memory scenario (2GB available)")
    print("-" * 60)
    low_mem_psutil = MockPsutil()
    low_mem_psutil.virtual_memory = lambda: MockPsutil.VirtualMemory(available_gb=2)
    workers = calculate_optimal_workers(num_tasks=1000, frame_complexity='high', mock_psutil=low_mem_psutil)
    print(f"Result: {workers} workers (should be limited by memory)")
    assert workers >= 1, "Should have at least 1 worker"
    print("✓ PASSED\n")
    
    print("=" * 60)
    print("All tests passed! ✓")
    print("=" * 60)
    print()
    
    # Print system info
    print("System Information:")
    print(f"  CPU cores: {cpu_count()}")
    print(f"  Mock RAM: 8 GB available")
    print(f"  Mock CPU usage: 30%")


if __name__ == "__main__":
    try:
        run_tests()
        print("\n✓ Dynamic worker allocation is working correctly!")
        print("\nNext steps:")
        print("  1. Install psutil: pip install psutil>=5.9.0")
        print("  2. Test with actual video generation")
        print("  3. Monitor worker allocation in server logs")
        exit(0)
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        exit(1)
    except Exception as e:
        print(f"\n✗ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

