// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// Uncomment this line to use console.log
import "hardhat/console.sol";

contract MetaSender {
    constructor() {}

    function getTotalValue(uint256[] memory _value)
        private
        pure
        returns (uint256)
    {
        uint256 _amount;
        for (uint256 i = 0; i < _value.length; i++) {
            _amount += _value[i];
        }
        require(_amount > 0);
        return _amount;
    }

    function transferBatchSameValueETH(address[] memory _to, uint256 _value)
        external
        payable
    {
        require(_to.length < 255, "Max 244 transaction by batch");
        uint256 remainingValue = msg.value;
        require(
            remainingValue >= _value * _to.length,
            "The value is less than required"
        );
        for (uint256 i = 0; i < _to.length; i++) {
            remainingValue -= _value;
            require(payable(_to[i]).send(_value), "Transaction not sended");
        }
        if (remainingValue > 0) payable(msg.sender).transfer(remainingValue);
    }

    function transferBatchDifferenValueETH(
        address[] memory _to,
        uint256[] memory _value
    ) external payable {
        require(
            _to.length == _value.length,
            "Addresses and values most be iqual"
        );
        require(_to.length < 255, "Max 244 transaction by batch");
        uint256 remainingValue = msg.value;
        require(
            remainingValue >= getTotalValue(_value),
            "The value is less than required"
        );
        for (uint256 i = 0; i < _value.length; i++) {
            remainingValue -= _value[i];
            require(payable(_to[i]).send(_value[i]), "for");
        }
        if (remainingValue > 0) payable(msg.sender).transfer(remainingValue);
    }
}
