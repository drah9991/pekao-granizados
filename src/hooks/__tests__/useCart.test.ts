import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCart } from '../useCart';

describe('useCart - Critical Calculations', () => {
  beforeEach(() => {
    // Reset cart state before each test
    const { result } = renderHook(() => useCart());
    act(() => {
      result.current.resetCart();
    });
  });

  it('should calculate subtotal correctly', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(
        { id: '1', name: 'Granizado', price: 5000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        2
      );
    });

    expect(result.current.subtotal).toBe(10000);
  });

  it('should apply percentage discount correctly', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(
        { id: '1', name: 'Granizado', price: 10000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        1
      );
    });

    act(() => {
      result.current.setDiscountType('percent'); // Fixed: 'percent' not 'percentage'
      result.current.setDiscount(10);
    });

    expect(result.current.subtotal).toBe(10000);
    expect(result.current.discountAmount).toBe(1000);
    expect(result.current.total).toBe(9000);
  });

  it('should apply fixed discount correctly', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(
        { id: '1', name: 'Granizado', price: 10000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        1
      );
      result.current.setDiscountType('fixed');
      result.current.setDiscount(2000);
    });

    expect(result.current.subtotal).toBe(10000);
    expect(result.current.discountAmount).toBe(2000);
    expect(result.current.total).toBe(8000);
  });

  it('should update quantity correctly', () => {
    const { result } = renderHook(() => useCart());
    let cartItemId: string;

    act(() => {
      result.current.addToCart(
        { id: '1', name: 'Granizado', price: 5000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        2
      );
    });

    cartItemId = result.current.cart[0].id;
    expect(result.current.cart[0].quantity).toBe(2);
    expect(result.current.subtotal).toBe(10000);

    // updateQuantity uses delta (increment), not absolute value
    act(() => {
      result.current.updateQuantity(cartItemId, 3); // 2 + 3 = 5
    });

    expect(result.current.cart[0].quantity).toBe(5);
    expect(result.current.subtotal).toBe(25000);
  });

  it('should remove item correctly', () => {
    const { result } = renderHook(() => useCart());
    let cartItemId: string;

    act(() => {
      result.current.addToCart(
        { id: '1', name: 'Granizado', price: 5000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        1
      );
    });

    cartItemId = result.current.cart[0].id;

    expect(result.current.cart.length).toBe(1);

    act(() => {
      result.current.removeItem(cartItemId);
    });

    expect(result.current.cart.length).toBe(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('should reset cart correctly', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(
        { id: '1', name: 'Granizado', price: 5000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        3
      );
      result.current.setDiscount(10);
      result.current.setSelectedCustomer({ id: '1', name: 'Cliente Test' } as any);
    });

    expect(result.current.cart.length).toBe(1);
    expect(result.current.discount).toBe(10);

    act(() => {
      result.current.resetCart();
    });

    expect(result.current.cart.length).toBe(0);
    expect(result.current.discount).toBe(0);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.total).toBe(0);
  });

  it('should handle multiple items with different prices', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(
        { id: '1', name: 'Granizado Pequeño', price: 3000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        2
      );
      result.current.addToCart(
        { id: '2', name: 'Granizado Grande', price: 5000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        3
      );
    });

    expect(result.current.cart.length).toBe(2);
    expect(result.current.subtotal).toBe(21000); // (3000 * 2) + (5000 * 3)
  });

  it('should not apply discount greater than subtotal', () => {
    const { result } = renderHook(() => useCart());

    act(() => {
      result.current.addToCart(
        { id: '1', name: 'Granizado', price: 5000, category_id: 'cat1' } as any,
        '',
        [],
        false,
        1
      );
      result.current.setDiscountType('fixed');
      result.current.setDiscount(10000);
    });

    expect(result.current.total).toBeGreaterThanOrEqual(0);
  });
});
